//////////////////////////////////////////////////////////////
// Add a middleware to check for the validity of the webhook
//////////////////////////////////////////////////////////////

var getRawBody = Npm.require('raw-body');

authenticateOfferJarWebhook = function (req, res, next) { 
  if (_.has(req.headers,'content-md5')) {
    return getTawBody(req,'utf-8',function(err,str) {
      if (err) {
        err.status = 400;
        return next(err);
      }
      
      console.log("authenticateOfferJarWebhook:");
      console.log("   String is: %s",str);
      var json = JSON.parse(str);
      console.log("   JSON is: %j",json);
      var conversation = Conversations.findOne({uid: json.uid});
      if (conversation) {
        var md5 = CryptoJS.MD5().toString();
        console.log("   MD5 Check:");
        console.log("      Header:      %s",req.headers['content-md5']);
        console.log("      Calculated:  %s",md5);
        if (md5===req.headers['content-md5']) {
          req.body = json;
          req._body = true; // Flag as parsed already
          return next();
        } else {
          err = new Error("MD5 Mismtach!");
          err.status = 412;
          return next(err);
        }
      } else {
        err = new Error("Unable to find conversation resource + json.uid");
        err.status = 400;
        return next(err);
      }
    });
  } else {
    return next();
  }
}

var offerJarWebhookPostAction = function() {
  var body = this.body;
  if (_.isObject(body) && _.has(body,'nuid')) {
    Negotiations.webhookUpdate(body);
  } else {
    throw Meteor.Error('webhook-error',"Webhook structure is incorrect!");
  }
}

OfferJar.UI.webhook = {
  path: 'offerjar/webhook',
  name: 'offerjar.webhook',
  action: offerJarWebhookPostAction,
  authHook: authenticateOfferJarWebhook,
  authenticate: true,
  skipAction: false,
  url: function() {
    router.routes[this.name].url();
  }
}

OfferJar.UI.webhook.setup = function(router, options) {
  options = _.extend(OfferJar.UI.webhook, options);

  if (!options.skipAction) {
    router.route(options.path,{name: options.name, where: 'server'})
      .post(options.action);
  }
  
  if (options.authenticate) {
    router.onBeforeAction(options.authHook,{only: [options.name]});
  }
}
