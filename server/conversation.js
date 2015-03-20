/*
 * Creates a conversation proxy connection for a user
 *
 * Fields:
 *   uid: The uid of the conversation on the OfferJar/InKomerce server
 *   token: The token used to connect to the OfferJar/InKomerce server
 *   userId: The user _id that owns the conversation
 *   partnerUID: The UID of the partner that owner the conversation.
 *
 */

OfferJar.UI.Conversations = new Mongo.Collection("offerjar.conversations");

Conversations = OfferJar.UI.Conversations;

ConversationProxy = OfferJar.ConversationProxy;

var conversationsProxiesHash = {};

Conversations.findAllUserConversations = function(userId,partner) {
  if (!partner || _.isString(partner) ) {
    partner = PartnerProxy.get(partner);
  }
  
  return Conversations.find({ userId: userId, partnerUID: partner.uid});
}

Conversations.findUserConversation = function(userId,partner) {
  if (!partner || _.isString(partner) ) {
    partner = PartnerProxy.get(partner);
  }

  return _.first(Conversations.find({ userId: userId, partnerUID: partner.uid}, { limit: 1 }));
}

ConversationProxy.findUserConversationProxy = function(userId,partner) {
  var conversation = Conversations.findUserConversation(userId,partner);
  var conversationProxy = null;
  
  if (conversation) {
    conversationProxy = ConversationProxy.get(conversation.uid);
    
    if (_.isNull(conversationProxy)) {
      conversationProxy = new OfferJar.ConversationProxy(conversation.token);
      conversationProxy.connect(conversation.uid);
      conversationsProxiesHash[conversation.uid] = conversationProxy;
      conversationProxy._conversationProxyHashRef = 1;
    }
  }

  return conversationProxy;
}

ConversationProxy.prototype.releaseConversationHash = function() {
  this._conversationProxyHashRef--;
  if (this._conversationProxyHashRef<=0) {
    delete conversationsProxiesHash[this.uid];
  }
}

ConversationProxy.get = function(uid) {
  if (_.has(conversationsProxiesHash,uid)) {
    var conversations_proxy = conversationsProxiesHash[conversation.uid];
    conversations_proxy._conversationProxyHashRef++;
    return conversations_proxy;
  } else {
    return null;
  }
}

ConversationProxy.findOrCreateUserConversationProxy = function(userId,partner) {
  if (!partner || _.isString(partner) ) {
    partner = PartnerProxy.get(partner);
  }
  
  var conversationProxy = ConversationProxy.findUserConversationProxy(userId,partner);
  if (! _.isNull(conversationProxy) ) {
    return conversationProxy;
  }

  var user = Meteor.users.findOne(userId);
  var service_record = partner.affiliateUser(user);
  
  var conversationProxy = new ConversationProxy();
  conversationProxy.create_by_token(service_record.token,{
    notification_mode: 'push',
    webhook: OfferJar.UI.webhook.url()
  });
  
  var conversation = _.pick(conversationProxy,'uid','token');
  conversation.userId = userId;
  conversation.partnerUID = partner.uid;
  
  Conversations.insert(conversation);
  
  conversationProxy._conversationProxyHashRef = 1;
  conversationsProxiesHash[conversation.uid] = conversationProxy;
  return conversationProxy;
  
}

