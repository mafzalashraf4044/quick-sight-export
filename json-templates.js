const {
  AWS_DUPLO_ACCOUNT_ID,
  DUPLO_IAM_USER,
  AWS_AVE_ACCOUNT_ID,
} = require("./config");

const DATA_SOURCE_TEMPLATE = {
  AwsAccountId: AWS_DUPLO_ACCOUNT_ID,
  DataSourceId: null,
  Name: null,
  Type: null,
  DataSourceParameters: {
    RedshiftParameters: {
      Host: null,
      Port: 5432,
      Database: null,
    },
  },
  Credentials: {
    CredentialPair: {
      Username: "...", // TODO: Define username here
      Password: "...", // TODO: Define password here
    },
  },
  Permissions: [
    {
      Principal: `arn:aws:quicksight:us-east-1:${AWS_DUPLO_ACCOUNT_ID}:user/default/${DUPLO_IAM_USER}`,
      Actions: [
        "quicksight:UpdateDataSourcePermissions",
        "quicksight:DescribeDataSource",
        "quicksight:DescribeDataSourcePermissions",
        "quicksight:PassDataSource",
        "quicksight:UpdateDataSource",
        "quicksight:DeleteDataSource"
      ],
    },
  ],
};

const DATA_SET_TEMPLATE = {
  AwsAccountId: AWS_DUPLO_ACCOUNT_ID,
  DataSetId: null,
  Name: null,
  PhysicalTableMap: null,
  LogicalTableMap: null,
  ImportMode: "SPICE",
  Permissions: [
    {
      Principal: `arn:aws:quicksight:us-east-1:${AWS_DUPLO_ACCOUNT_ID}:user/default/${DUPLO_IAM_USER}`,
      Actions: [
        "quicksight:UpdateDataSetPermissions",
        "quicksight:DescribeDataSet",
        "quicksight:DescribeDataSetPermissions",
        "quicksight:PassDataSet",
        "quicksight:DescribeIngestion",
        "quicksight:ListIngestions",
        "quicksight:UpdateDataSet",
        "quicksight:DeleteDataSet",
        "quicksight:CreateIngestion",
        "quicksight:CancelIngestion",
      ],
    },
  ],
};

const DASHBOARD_TEMPLATE = {
    "AwsAccountId": AWS_AVE_ACCOUNT_ID,
    "TemplateId": null,
    "Name": null,
    "SourceEntity": null,
    "VersionDescription": "1"
};

const ANALYSIS_TEMPLATE = {
  "AwsAccountId": AWS_DUPLO_ACCOUNT_ID,
  "AnalysisId": null,
  "Name": null,
  "Permissions": [
      {
        "Principal": `arn:aws:quicksight:us-east-1:${AWS_DUPLO_ACCOUNT_ID}:user/default/${DUPLO_IAM_USER}`,
        "Actions": [
          "quicksight:RestoreAnalysis",
          "quicksight:UpdateAnalysisPermissions",
          "quicksight:DeleteAnalysis",
          "quicksight:QueryAnalysis",
          "quicksight:DescribeAnalysisPermissions",
          "quicksight:DescribeAnalysis",
          "quicksight:UpdateAnalysis"
        ]
      }
    ],
  "SourceEntity": null
};

const CREATE_DASHBOARD_TEMPLATE = {
    "AwsAccountId": AWS_DUPLO_ACCOUNT_ID,
    "DashboardId": null,
    "Name": null,
    "Permissions": [
        {
            "Principal": `arn:aws:quicksight:us-east-1:${AWS_DUPLO_ACCOUNT_ID}:user/default/${DUPLO_IAM_USER}`,
            "Actions": [
                "quicksight:DescribeDashboard",
                "quicksight:ListDashboardVersions",
                "quicksight:UpdateDashboardPermissions",
                "quicksight:QueryDashboard",
                "quicksight:UpdateDashboard",
                "quicksight:DeleteDashboard",
                "quicksight:DescribeDashboardPermissions",
                "quicksight:UpdateDashboardPublishedVersion"
            ]
        }
    ],
    "SourceEntity": {
        "SourceTemplate": {
            "DataSetReferences": [
                {
                   "DataSetPlaceholder": "TicketInfo",
                    "DataSetArn": "arn:aws:quicksight:us-east-2:86********55:dataset/24b1b03a-86ce-41c7-9df7-5be5343ff9d9"
                }
            ],
            "Arn": "arn:aws:quicksight:us-east-2:31********64:template/Sporting_event_ticket_info_template"
        }
    },
    "VersionDescription": "1",
    "DashboardPublishOptions": {
        "AdHocFilteringOption": {
            "AvailabilityStatus": "DISABLED"
        },
        "ExportToCSVOption": {
            "AvailabilityStatus": "ENABLED"
        },
        "SheetControlsOption": {
            "VisibilityState": "EXPANDED"
        }
    }
}

module.exports = {
  DATA_SOURCE_TEMPLATE,
  DATA_SET_TEMPLATE,
  DASHBOARD_TEMPLATE,
  ANALYSIS_TEMPLATE,
  CREATE_DASHBOARD_TEMPLATE,
};
