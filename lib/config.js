// create and export configuration variables

// container for all the environments
const  environments = {};

// Staging (default) environment
environments.staging = {
    'httpPort': 4000,
    'httpsPort': 4001,
    'envName': 'staging',
    'hashingSecret': 'sacredsecret',
    'maxChecks': 5,
    'twilio': {
        'accountSid': 'AC8b5e019666ceac8f9e0691e828c980c6',
        'authToken': 'acdd7ba5582c7cce4026020777649096',
        'fromPhone': '+16507708924'
    }
};

// Production environment (port 443 https, port 80 http)
environments.production = {
    'httpPort': 5000,
    'httpsPort': 5001,
    'envName': 'production',
    'hashingSecret': 'sacredsecret',
    'maxChecks': 5,
    'twilio': {
        'accountSid': 'AC8b5e019666ceac8f9e0691e828c980c6',
        'authToken': 'acdd7ba5582c7cce4026020777649096',
        'fromPhone': '+16507708924'
    }
};

// Determine which environments was passed as a command-line argument
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : "";

// check that the environment was passed is a valid argument
const environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;