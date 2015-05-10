/*
 * Get a button information: used as a local cache for buttons instead of
 * reading data all the time from the OfferJar/InKomerce server.
 *   
 */

OfferJar.UI.Buttons = Buttons = new Mongo.Collection(null);

Global = OfferJar.UI.Global = new OfferJar.Global();

Buttons.findOrDownloadButton = function(buid) {
  var self = this;
  var cursor = self.find({button_uid: buid},{limit: 1});
  
  if (cursor.count()===0) {
    Global.getButton(buid,{image_style: 'all'}, function(error,result) {
      if (error) {
        throw error;
      } else if (!result.data.button){ 
        throw new Meteor.Error('500',"Internal server error. Unable to get the button information");
      } else {
        self.insert(result.data.button);
      }
    });
    return null;
  } else {
    return cursor.fetch()[0];
  }
}

OfferJar.UI.currentButton = new ReactiveVar(null,twoOfferJarRecordsEq('button_uid'));

Meteor.startup(function() {
  Tracker.autorun(function() {
    var negotiation = OfferJar.UI.currentNegotiation.get();
    if (_.isObject(negotiation) && _.has(negotiation,'buid')) {
      OfferJar.UI.currentButton.set(Buttons.findOrDownloadButton(negotiation.buid));
    }
  });
});