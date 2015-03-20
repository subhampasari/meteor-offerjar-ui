Package.describe({
  name: 'ronenm:offerjar-ui',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: '',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Npm.depends({
  'raw-body': '1.3.0'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0.3.1');
  api.use('ronenm:currency@0.1.2');
  api.use('ronenm:offerjar-api@0.1.0');
  api.use('ronenm:offerjar-user-affinity@0.1.0');
  api.use('ronenm:statefull-collection@0.0.1');
  api.use("underscore");
  api.use("accounts-base");
  api.use("iron:router");
  api.use("mongo");
  api.use("check");
  api.use("jparker:crypto-md5",'server');
  api.use([
    'blaze',
    'spacebars',
    'templating',
    'minimongo'
  ], 'client');
  api.addFiles('ronenm:offerjar-ui.js');
  api.addFiles([
    'lib/controller.js',
    'lib/negotiation.js',
    'lib/routing.js'
  ]);
  api.addFiles([
    'server/conversation.js',
    'server/negotiation.js',
    'server/webhook.js'
  ],'server');
  api.addFiles([
    'client/button.js',
    'client/negotiation.js',
    'client/helpers.js'
  ], 'client');
  api.export('OfferJarController');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('ronenm:offerjar-ui');
  api.addFiles('ronenm:offerjar-ui-tests.js');
});