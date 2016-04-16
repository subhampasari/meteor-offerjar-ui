//////////////////////////////////////////////////////////////
// Add a middleware to check for the validity of the webhook
//////////////////////////////////////////////////////////////

var getRawBody = Npm.require('raw-body');
Fiber = Npm.require('fibers');

authenticateOfferJarWebhook = function (req, res, next) { 
  if (_.has(req.headers,'content-md5')) {
    return getRawBody(req,'utf-8',function(err,str) {
      if (err) {
        err.status = 400;
        return next(err);
      }
      
      console.log("authenticateOfferJarWebhook:");
      console.log("   String is: %s",str);
      var json = JSON.parse(str);
      console.log("   JSON is: %j",json);
      var conversation;
      
      Fiber(function() {
        conversation = Conversations.findOne({uid: json.cuid});
        if (conversation) {
          var md5 = CryptoJS.MD5(conversation.token+str).toString();
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
          err = new Error("Unable to find conversation resource " + json.cuid);
          err.status = 400;
          return next(err);
        }
      }).run();
    });
      
  } else {
    return next();
  }
}

var offerJarWebhookPostAction = function() {
  var body = this.request.body;
  console.log("body = ",body);
  if (_.isObject(body) && _.has(body,'nuid')) {
    return Negotiations.webhookUpdate(body);
  } else {
    throw new Meteor.Error('webhook-error',"Webhook structure is incorrect!");
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
    return OfferJar.UI.webhook.router.routes[this.name].url();
  }
}

OfferJar.UI.webhook.setup = function(router, options) {
  options = _.extend(OfferJar.UI.webhook, options);
  OfferJar.UI.webhook.router  = router;
  
  if (!options.skipAction) {
    router.route(options.path,{name: options.name, where: 'server'})
      .post(options.action);
  }
  
  if (options.authenticate) {
    router.onBeforeAction(options.authHook,{only: [options.name]});
  }
}
