const fs = require('fs');
const aws = require('aws-sdk');
const uuid = require('uuid/v4');

const {
  AWS_AVE_CONFIG,
  AWS_AVE_ACCOUNT_ID,
  AWS_DUPLO_CONFIG,
  AWS_DUPLO_ACCOUNT_ID,
  DASHBOARD_ID,
  DUPLO_REDSHIFT_HOST,
  TENANT,
} = require('./config');

const {
  DATA_SOURCE_TEMPLATE,
  DATA_SET_TEMPLATE,
  DASHBOARD_TEMPLATE,
  ANALYSIS_TEMPLATE,
  CREATE_DASHBOARD_TEMPLATE,
} = require('./json-templates');

const quickSightAVE = new aws.QuickSight({
  region: 'us-east-2',
  accessKeyId: AWS_AVE_CONFIG.accessKeyId,
  secretAccessKey: AWS_AVE_CONFIG.secretAccessKey,
});

const quickSightDUPLO = new aws.QuickSight({
  region: 'us-east-2',
  accessKeyId: AWS_DUPLO_CONFIG.accessKeyId,
  secretAccessKey: AWS_DUPLO_CONFIG.secretAccessKey,
});

let existingDataSources = [];
let existingDataSets = [];

async function getSourceDashboardParameters(dashboardId) {
  const source = {
    dashboard: null,
    dataSets: [],
    dataSources: [],
    analysis: null,
  };

  const dashboardParams = {
    AwsAccountId: AWS_AVE_ACCOUNT_ID,
    DashboardId: dashboardId,
  };

  let dashboard;
  try {
    const response = await quickSightAVE.describeDashboard(dashboardParams).promise();
    dashboard = response.Dashboard;
  } catch (error) {
    console.log('ERROR => getSourceDashboardParameters => describeDashboard', error);
  }

  source.dashboard = dashboard;

  const analysisId = dashboard.Version.SourceEntityArn.split('/')[1];

  const analysisParams = {
    AwsAccountId: AWS_AVE_ACCOUNT_ID,
    AnalysisId: analysisId,
  };

  let analysis;
  try {
    const response = await quickSightAVE.describeAnalysis(analysisParams).promise();
    analysis = response.Analysis;
  } catch (error) {
    console.log('ERROR => getSourceDashboardParameters => describeAnalysis', error);
  }

  source.analysis = analysis;

  for (let dataSetArn of dashboard.Version.DataSetArns) {
    const dataSetId = dataSetArn.split('/')[1];

    const dataSetParams = {
      AwsAccountId: AWS_AVE_ACCOUNT_ID,
      DataSetId: dataSetId,
    };

    let dataSet;

    try {
      const response = await quickSightAVE.describeDataSet(dataSetParams).promise();
      dataSet = response.DataSet;
    } catch (error) {
      console.log('ERROR => getSourceDashboardParameters => describeDataSet', error);
    }

    source.dataSets.push(dataSet);

    for (const key in dataSet.PhysicalTableMap) {
      if (!Object.hasOwnProperty.call(dataSet.PhysicalTableMap, key)) {
        continue;
      }

      const dataSourceArn = dataSet.PhysicalTableMap[key].RelationalTable.DataSourceArn;
      const dataSourceId = dataSourceArn.split('/')[1];

      const dataSourceParams = {
        AwsAccountId: AWS_AVE_ACCOUNT_ID,
        DataSourceId: dataSourceId,
      };

      let dataSource;
      try {
        const response = await quickSightAVE.describeDataSource(dataSourceParams).promise();
        dataSource = response.DataSource;
      } catch (error) {
        console.log('ERROR => getSourceDashboardParameters => describeDataSource', error);
      }

      source.dataSources.push(dataSource);
    }
  }

  return source;
}

async function createJSONFilesForMigration({dashboard, dataSets, dataSources, analysis}) {
  const destination = {
    dashbaord: null,
    template: null,
    dataSources: [],
    dataSets: [],
  };

  const key = 'DataSourceId';
  const _dataSources = [...new Map(dataSources.map(item =>
    [item[key], item])).values()];

  for (let i = 0; i < _dataSources.length; i++) {
    const dataSource = _dataSources[i];
    
    const existingDataSource = 
      existingDataSources.find(ds => ds.Name === `${TENANT} ${dataSource.Name}`);

    if (existingDataSource) {
      existingDataSource.existing = true;
      destination.dataSources.push(existingDataSource);
    } else {
      const dataSourceParameters = JSON.parse(JSON.stringify(DATA_SOURCE_TEMPLATE.DataSourceParameters));
      dataSourceParameters.RedshiftParameters.Host = DUPLO_REDSHIFT_HOST;
      dataSourceParameters.RedshiftParameters.Database = 'analytics_db';
      dataSourceParameters.RedshiftParameters.Port = 5439;
  
      const dataSourceId = uuid();
  
      const dataSourceJSON = {
        ...DATA_SOURCE_TEMPLATE,
        DataSourceId: dataSourceId,
        Name: `${TENANT} ${dataSource.Name}`,
        Type: dataSource.Type,
        DataSourceParameters: dataSourceParameters,
        VpcConnectionProperties: {
          VpcConnectionArn: `arn:aws:quicksight:us-east-2:${AWS_DUPLO_ACCOUNT_ID}:vpcConnection/default`,
        },
        SslProperties: {
          DisableSsl: false
        }
      };
  
      destination.dataSources.push(dataSourceJSON);
    }  
  }

  for (let i = 0; i < dataSets.length; i++) {
    const dataSet = dataSets[i];

    const existingDataSet = existingDataSets.find(ds => ds.Name === `${TENANT} ${dataSet.Name}`);
    
    if (existingDataSet) {
      existingDataSet.existing = true;
      destination.dataSets.push(existingDataSet);
    } else {
      const sourcePhysicalTableId = Object.keys(dataSet.PhysicalTableMap)[0];
      const sourceDataSourceArn = dataSet.PhysicalTableMap[sourcePhysicalTableId].RelationalTable.DataSourceArn;
      const sourceDataSourceId = sourceDataSourceArn.split('/')[1];
      const indexOfSourceDataSource = _dataSources.findIndex(ds => ds.DataSourceId === sourceDataSourceId);
      const dataSourceId = destination.dataSources[indexOfSourceDataSource].DataSourceId;
  
      const physicalTableId = uuid();
      const logicalTableId = uuid();
      const physicalTableMap = {
        [physicalTableId]: {
          RelationalTable: {
            ...dataSet.PhysicalTableMap[sourcePhysicalTableId].RelationalTable,
            DataSourceArn: `arn:aws:quicksight:us-east-2:${AWS_DUPLO_ACCOUNT_ID}:datasource/${dataSourceId}`,
          }
        }
      };
  
      const sourceLogicalTableId = Object.keys(dataSet.LogicalTableMap)[0];
  
      const logicalTableMap = {
        [logicalTableId]: {
          Alias: dataSet.LogicalTableMap[sourceLogicalTableId].Alias,
          DataTransforms: dataSet.LogicalTableMap[sourceLogicalTableId].DataTransforms,
          Source: {
            "PhysicalTableId": physicalTableId,
            "DataSetArn": null
          },
        },
      };
  
      const dataSetId = uuid();
  
      const dataSetJSON = {
        ...DATA_SET_TEMPLATE,
        DataSetId: dataSetId,
        Name: `${TENANT} ${dataSet.Name}`,
        PhysicalTableMap: physicalTableMap,
        LogicalTableMap: logicalTableMap,
      };
  
      destination.dataSets.push(dataSetJSON);
    }
  }

  const templateId = uuid();

  const templateJSON = {
    ...DASHBOARD_TEMPLATE,
    TemplateId: templateId,
    Name: `${TENANT} ${dashboard.Name}`,
    SourceEntity: {
      SourceAnalysis: {
          Arn: dashboard.Version.SourceEntityArn,
          DataSetReferences: dataSets.map(ds => ({
            DataSetPlaceholder: `${TENANT} ${ds.Name}`,
            DataSetArn: `arn:aws:quicksight:us-east-2:${AWS_AVE_ACCOUNT_ID}:dataset/${ds.DataSetId}`
          })),
      }
    },
    VersionDescription: "1"
  };

  destination.template = templateJSON;
  
  const dashboardId = uuid();

  const dashboardTemplateJSON = {
    ...CREATE_DASHBOARD_TEMPLATE,
    DashboardId: dashboardId,
    Name: `${TENANT} ${dashboard.Name}`,
    SourceEntity: {
      SourceTemplate: {
          Arn: `arn:aws:quicksight:us-east-2:${AWS_AVE_ACCOUNT_ID}:template/${templateId}`,
          DataSetReferences: destination.dataSets.map(ds => ({
            DataSetPlaceholder: ds.Name,
            DataSetArn: `arn:aws:quicksight:us-east-2:${AWS_DUPLO_ACCOUNT_ID}:dataset/${ds.DataSetId}`
          })),
      }
    },
    VersionDescription: "1"
  };

  destination.dashboard = dashboardTemplateJSON;

  const analysisId = uuid();

  const analysisTemplateJSON = {
    ...ANALYSIS_TEMPLATE,
    AnalysisId: analysisId,
    Name: `${TENANT} ${analysis.Name}`,
    SourceEntity: {
      SourceTemplate: {
          Arn: `arn:aws:quicksight:us-east-2:${AWS_AVE_ACCOUNT_ID}:template/${templateId}`,
          DataSetReferences: destination.dataSets.map(ds => ({
            DataSetPlaceholder: ds.Name,
            DataSetArn: `arn:aws:quicksight:us-east-2:${AWS_DUPLO_ACCOUNT_ID}:dataset/${ds.DataSetId}`
          })),
      }
    },
  };

  destination.analysis = analysisTemplateJSON;

  return destination;
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

async function createTemplate(params) {
  let createdTemplate = await quickSightAVE.createTemplate(params).promise();

  let templateCreated = false;

  while(!templateCreated) {
    await delay(5000);

    const describeTemplateParams = {
      AwsAccountId: AWS_AVE_ACCOUNT_ID,
      TemplateId: createdTemplate.TemplateId,
    };
    const { Template } = await quickSightAVE.describeTemplate(describeTemplateParams).promise();

    if (Template.Version.Status === "CREATION_SUCCESSFUL") {
      createdTemplate = Template;
      templateCreated = true;
    }
  }

  return createdTemplate;
}

async function createAnalysis(params) {
  let createdAnalysis = await quickSightDUPLO.createAnalysis(params).promise();

  let analysisCreated = false;

  while(!analysisCreated) {
    await delay(5000);

    const describeAnalysisParams = {
      AwsAccountId: AWS_DUPLO_ACCOUNT_ID,
      AnalysisId: createdAnalysis.AnalysisId,
    };
    const { Analysis } = await quickSightDUPLO.describeAnalysis(describeAnalysisParams).promise();

    if (Analysis.Status === "CREATION_SUCCESSFUL") {
      createdAnalysis = Analysis;
      analysisCreated = true;
    }
  }

  return createdAnalysis;
}

async function updateTemplatePermissions(template) {
  const updateTemplateParams = {
    AwsAccountId: AWS_AVE_ACCOUNT_ID,
    TemplateId: template.TemplateId,
    GrantPermissions: [
      {
        Principal: `arn:aws:iam::${AWS_DUPLO_ACCOUNT_ID}:root`,
        Actions: [
          "quicksight:UpdateTemplatePermissions",
          "quicksight:DescribeTemplate",
        ],
      },
    ],
  };

  await quickSightAVE.updateTemplatePermissions(updateTemplateParams).promise();
}

async function createDataSource(params) {
  params.AwsAccountId = AWS_DUPLO_ACCOUNT_ID;
  let createdDataSource = await quickSightDUPLO.createDataSource(params).promise();

  let dataSourceCreated = false;

  while(!dataSourceCreated) {
    await delay(5000);

    const describeDataSourceParams = {
      AwsAccountId: AWS_DUPLO_ACCOUNT_ID,
      DataSourceId: createdDataSource.DataSourceId,
    };
    const { DataSource } = await quickSightDUPLO.describeDataSource(describeDataSourceParams).promise();

    if (DataSource.Status === "CREATION_SUCCESSFUL") {
      createdDataSource = DataSource;
      dataSourceCreated = true;
    }
  }

  return createdDataSource;
}

async function createDataSet(params) {
  params.AwsAccountId = AWS_DUPLO_ACCOUNT_ID;
  const createdDataSet = await quickSightDUPLO.createDataSet(params).promise();

  return createdDataSet;
}

async function createDasboard(params) {
  params.AwsAccountId = AWS_DUPLO_ACCOUNT_ID;
  const createdDashboard = await quickSightDUPLO.createDashboard(params).promise();

  return createdDashboard;
}

async function migrateDashboard({dashboard, analysis, dataSets, dataSources, template }) {
  let createdTemplate = await createTemplate(template);

  try {
    await updateTemplatePermissions(createdTemplate);
  } catch (err) {
    console.log('Error => updateTemplatePermissions', err);
  }

  for (const dataSource of dataSources) {
    try {
      if (!dataSource.existing) {
        await createDataSource(dataSource);
      }
    } catch (err) {
      console.log('Error => createDataSource', err.message);
    }
  }

  for (const dataSet of dataSets) {
    try {
      if (!dataSet.existing) {
        await createDataSet(dataSet);
      }
    } catch (err) {
      console.log('Error => createDataSet', err);
    }
  }

  await createAnalysis(analysis);

  try {
    await createDasboard(dashboard);
  } catch (err) {
    console.log('Error => createDasboard', err);
  }
}

async function getExistingDataSources() {
  
  let nextToken = null;

  do {
    const params = {
      AwsAccountId: AWS_DUPLO_ACCOUNT_ID,
      NextToken: nextToken,
    };

    const result = await quickSightDUPLO.listDataSources(params).promise();
    existingDataSources.push(...result.DataSources);
    nextToken = result.NextToken;
  } while(nextToken);
}

async function getExistingDataSets() {
  
  let nextToken = null;

  do {
    const params = {
      AwsAccountId: AWS_DUPLO_ACCOUNT_ID,
      NextToken: nextToken,
    };

    const result = await quickSightDUPLO.listDataSets(params).promise();
    existingDataSets.push(...result.DataSetSummaries);
    nextToken = result.NextToken;
  } while(nextToken);
}

(async function() {
  console.log('MIGRATION STARTED FOR' + DASHBOARD_ID);

  await getExistingDataSets();
  await getExistingDataSources();

  const source = await getSourceDashboardParameters(DASHBOARD_ID);

  console.log('source', JSON.stringify(source));

  const destination = await createJSONFilesForMigration(source);

  console.log('destination', JSON.stringify(destination));

  await migrateDashboard(destination);

  console.log('DONE');
})();