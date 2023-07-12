const aws = require('aws-sdk');

const {
  AWS_DUPLO_CONFIG,
  AWS_DUPLO_ACCOUNT_ID,
} = require('./config');

const quickSightDUPLO = new aws.QuickSight({
  region: 'us-east-2',
  accessKeyId: AWS_DUPLO_CONFIG.accessKeyId,
  secretAccessKey: AWS_DUPLO_CONFIG.secretAccessKey,
});

(async function() {
  try {
    const analysisIds = ['5bdefb8b-cbc2-4c73-8bdd-fc867eec948a', '1ac606dd-ecd4-40c2-8073-e20787ed9d7b', '4230bedf-a3f2-401c-a298-99378742f1a0', '7437a9f2-695c-47d2-96db-ad13af411058'];
    for (const item of analysisIds) {
      const params = {
        AwsAccountId: AWS_DUPLO_ACCOUNT_ID,
        AnalysisId: item,
        "ForceDeleteWithoutRecovery": true
      };

      const response = await quickSightDUPLO.deleteAnalysis(params).promise();
      console.log('response', response);
    }

    const dashboardIds = ['2c0a7027-477f-4d75-8780-7bc261884d80', '846e11cf-8401-4c2b-971c-91fa30590027', '7dfbe7f1-5388-4572-905e-f07043daedf7', 'b73bb83d-b2ba-4f06-a7c0-bcb3c9636b83'];
    for (const item of dashboardIds) {
      const params = {
        AwsAccountId: AWS_DUPLO_ACCOUNT_ID,
        DashboardId: item,
      };

      const response = await quickSightDUPLO.deleteDashboard(params).promise();
      console.log('response', response);
    }

    const dataSetIds = ['22448137-1db6-49ab-b7bd-7e043b8ed800', '5a6bf50d-c612-4af6-9b07-dd1dced23013'];
    for (const item of dataSetIds) {
      const params = {
        AwsAccountId: AWS_DUPLO_ACCOUNT_ID,
        DataSetId: item,
      };

      const response = await quickSightDUPLO.deleteDataSet(params).promise();
      console.log('response', response);
    }

    const dataSources = ['6e3f396c-e781-4702-98a7-7a6ffc1f9a11'];
    for (const item of dataSources) {
      const params = {
        AwsAccountId: AWS_DUPLO_ACCOUNT_ID,
        DataSourceId: item,
      };

      const response = await quickSightDUPLO.deleteDataSource(params).promise();
      console.log('response', response);
    }
  } catch (error) {
    console.log('ERROR', error);
  }
})();