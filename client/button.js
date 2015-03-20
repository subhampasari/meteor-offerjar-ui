/*
 * Get a button information: used as a local cache for buttons instead of
 * reading data all the time from the OfferJar/InKomerce server.
 *   
 */

OfferJar.UI.Buttons = Buttons = new Mongo.Collection("offerjar.buttons");

Global = OfferJar.UI.Global = new OfferJar.Global();

Buttons.findOrDownloadButton = function(buid) {
  var cursor = this.find({button_uid: buid},{limit: 1});
  if (cursor.count()===0) {
    Global.getButton(buid,{image_style: 'all'}, function(error,data) {
      if (error) {
        throw error;
      } else if (!data.button){ 
        throw new Meteor.Error('500',"Internal server error. Unable to get the button information");
      } else {
        Buttons.insert(data.button);
      }
    });
    return null;
  } else {
    return cursor.fetch()[0];
  }
}

OfferJar.UI.currentButton = new ReactiveVar(null,twoOfferJarRecordsEq);