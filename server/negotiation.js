// Server side Negotiation!

_.extend(Negotiations,{
  initiateBuyerNegotiation: function(buyerId,buid,bid,partner) {
    var conversationProxy = ConversationProxy.findOrCreateUserConversationProxy(buyerId,partner);
    var buyer = Meteor.users.findOne(buyerId);
    var partnerProxy = PartnerProxy.get(conversationProxy.partnerUID);
    var serviceRecord = partnerProxy.getServiceRecordForUser(buyer);
    
    var params = {
      kind: 'buy',
      user_affinity_token: serviceRecord.token,
      buid: buid,
      what: 'short',
    }
    if (_.isString(bid) || _.isNumber(bid)) {
      params.initial_bid = bid;
    }
    negRec = conversationProxy.initiateNegotiation(params).data;
    
    if (!(negRec && _.isObject(negRec.negotiation) && _.isString(negRec.negotiation.nuid))) {
      throw Meteor.Error('internal-error','Failed to initial negotiation!');
    }
    
    negRec = negRec.negotiation;
    var upsertRet = Negotiations.upsert({uid: negRec.nuid},{
      uid: negRec.nuid,
      buid: buid,
      cuid: conversationProxy.uid,
      bidderId: buyerId,
      state: negRec.state,
      availableTransitions: negRec.available_transitions,
      bid: negRec.bids && negRec.bids.your_bid,
      otherBid: negRec.bids && negRec.bids.counter_bid || negRec.final && negRec.final.price,
      saving: negRec.bids && negRec.bids.saving || negRec.final && ngeRec.final.saving,
      partnerUID: partnerProxy.uid,
      kind: 'buy'
    });
    return negRec.nuid;
  },
  remoteTransition: function(buyerId,transition,parameters) {
    // This is called with this as the negotiation document!
    if (buyerId!==this.bidderId) {
      throw Meteor.Error('access-mismatch','There is a mismatch between current user and user allowed to perform negotiation!!!');
    }
    var conversation = Conversations.findOne({uid: this.cuid});
    var conversationProxy = ConversationProxy.findUserConversationProxy(buyerId,conversation.partnerUID);
    return conversationProxy.do_negotiation(this.uid,transition,_.extend(parameters,{kind: this.kind}));
  },
  webhookUpdate: function(response) {
    var negotiation = Negotiations.find({uid: response.nuid, kind: response.kind});
    if (!negotiation) {
      return false;
    }
    
    var set = {
      bid: response.bid,
      otherBid: response.other_bid,
      state: response.state,
      availableTransitions: response.available_transitions,
      successData: response.success_data,
      cancelData: response.cancel_data,
      couponPopupData: coupon_popup_data,
      lastMessage: Negotiations.extractMessages(negotiation._id,response.messages,OfferJar.UI.keepAllMessages),
    }
    if (OfferJar.UI.keepHistory) {
      Negotiations.extractHistory(response.history);
    }
    return true;
  },
  refreshNegotiation: function(uid,kind) {
    if (!kind) kind = 'buy';
    var negotiation = Negotiations.find({uid: response.nuid, kind: response.kind});
    if (negotiation) {
      var conversation = Conversations.findOne({uid: negotiation.cuid});
      var conversationProxy = ConversationProxy.findUserConversationProxy(negotiation.bidderId,conversation.partnerUID);

      var poll = conversationProxy.get_negotiation_poll(uid,{kind: kind, last_id: negotiation.lastMessage && negotiation.lastMessage.id}).data;
      if (poll && _.has(poll,'conversation_payload')) {
        Negotiations.webhookUpdate(poll.conversation_payload);
      }
    }
  },
  extractMessages: function(negotiationId,messages,keepAll) {
    if (keepAll) {
      NegotiationsMessages.insertIfNotExists(negotiationId,messages);
    }
    return _.max(messages, function(message) { return message.id });
  },
  extractHistory: function(negotiationId,historyList) {
    return NegotiationsHistory.insertIfNotExists(negotiationId,historyList);
  }
});

// Publish and remote methods
Meteor.publish("offerjar.negotiations", function () {
  return Negotiations.find({ bidderId: this.userId });
});

Meteor.methods({
  initiateBuyerNegotiation: function(buid,bid,partnerUID) {
    if (this.userId===null) {
      throw Meteor.Error("not-allowed","You must be signed-up to perform a negotiation");
    }
    check(buid,OfferJar.UI.uidCheck);
    check(bid,Match.Optional(Match.OneOf(Number,Currency.LegalMoneyString)));
    check(partnerUID,Match.Optional(OfferJar.UI.uidCheck));
    return Negotiations.initiateBuyerNegotiation(this.userId,buid,bid,partner);
  }
});

if (OfferJar.UI.keepAllMessages || OfferJar.UI.keepHistory) {
  var findForNegotiation = function(negotiationId,options) {
    var defaults = {sort: [['id', 'desc']]};
    if (!options) {
      options = defaults;
    } else {
      _.defaults(options,defaults);
    }
    
    return this.find({negotiationId: negotiationId},options);
  }

  var insertIfNotExists = function(negotiationId,list) {
    var cursor = this.find({id: { $in: _.pluck(list,'id')}});
    var idHash = {};
    var counter = 0;
    cursor.forEach(function(record) {
      idHash[record.id] = 1;
    });
    _.each(list,function(item) {
      if (!idHash.hasOwnProperty(item.id)) {
        this.insert(_.extend(item,{negotiationId: negotiationId}));
        counter++;
      }
    });
    return counter;
  };
  
  if (OfferJar.UI.keepAllMessages) {
    _.extend(NegotiationsMessages,{
      insertIfNotExists: insertIfNotExists,
      findForNegotiation: findForNegotiation
    });
  }
  
  if (OfferJar.UI.keepHistory) {
    _.extend(NegotiationsHistory,{
      insertIfNotExists: insertIfNotExists,
      findForNegotiation: findForNegotiation
    });
  }
  
  if (OfferJar.UI.keepAllMessages || OfferJar.UI.keepHistory) {
    Meteor.publish("offerjar.negotiations.info", function(negotiationId) {
      var cursors = [];
      if (OfferJar.UI.keepAllMessages) {
        cursors.push(NegotiationsMessages.findForNegotiation(negotiationId));
      }
      if (OfferJar.UI.keepHistory) {
        cursors.push(NegotiationsHistory.findForNegotiation(negotiationId));
      }
      return cursors;
    });
  }
}

