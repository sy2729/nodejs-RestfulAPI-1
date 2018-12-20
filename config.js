// create and export configuration variable

// container for all the environments
var environments = {}

// Staging (default) environment
environments.staging = {
  'httpPort': 3000,
  'httpsPort': 3001,
  'envName': 'staging',
  'hashingSecret': 'thisISASecret',
  'maxChecks': 5,
  'twilio': {
    'accountSid' : 'ACb32d411ad7fe886aac54c665d25e5c5d',
    'authToken' : '9455e3eb3109edc12e3d8c92768f7a67',
    'fromPhone' : '+15005550006'
  },
  'templateGlobals' : {
    'appName': 'uptimechecker',
    'companyName' : 'Shuai Yuan',
    'yearCreated' : '2018',
    'baseUrl' : 'http://localhost:3000/'
  }
};

environments.production = {
  'httpPort': 5000,
  'httpsPort': 5001,
  'envName': 'production',
  'hashingSecret': 'thisISASecret',
  'maxChecks': 5,
  'twilio' : {
    'accountSid' : '',
    'authToken' : '',
    'fromPhone' : ''
  },
  'templateGlobals' : {
    'appName': 'uptimechecker',
    'companyName' : 'Shuai Yuan',
    'yearCreated' : '2018',
    'baseUrl' : 'http://localhost:5000/'
  }
}

// Determine which environemtn was passed as a command-line argument
var currentEnvironment = typeof (process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is one of the environment above, if not, default to staging
var environemtnToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environemtnToExport