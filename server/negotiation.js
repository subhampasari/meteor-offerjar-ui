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
    
    // Working with Schema and upsert does not work well
    var negotiation = Negotiations.findOne({uid: negRec.nuid });
    var ret;
    console.log("negRec: ",negRec);
    if (negotiation) {
      var set = {
        state: negRec.state,
        availableTransitions: negRec.available_transitions,
        otherBid: negRec.bids && Currency.parseStr(negRec.bids.counter_bid) || negRec.final && Currency.parseStr(negRec.final.price),
        saving: negRec.bids && Currency.parseStr(negRec.bids.saving) || negRec.final && Currency.parseStr(negRec.final.saving),
        currency: negRec.button && negRec.button.currency,
        title: negRec.button.title
      };
      if (negRec.bids && negRec.bids.your_bid) {
        set.bid = Currency.parseStr(negRec.bids.your_bid);
      }
      console.log("Setting negotiation: ",set);
      ret = Negotiations.update({uid: negRec.nuid},{
        $set: set
      }) ;
    } else {
      var insert = {
        uid: negRec.nuid,
        buid: buid,
        cuid: conversationProxy.uid,
        bidderId: buyerId,
        state: negRec.state,
        availableTransitions: negRec.available_transitions,
        otherBid: negRec.bids && Currency.parseStr(negRec.bids.counter_bid) || negRec.final && Currency.parseStr(negRec.final.price),
        saving: negRec.bids && Currency.parseStr(negRec.bids.saving) || negRec.final && Currency.parseStr(negRec.final.saving),
        partnerUID: partnerProxy.uid,
        kind: 'buy',
        currency: negRec.button && negRec.button.currency,
        title: negRec.button.title
      }
      if (negRec.bids && negRec.bids.your_bid) {
        insert.bid = Currency.parseStr(negRec.bids.your_bid);
      }
      console.log("Inserting negotiation: ",insert);
      ret = Negotiations.insert(insert);
    }
    Negotiations.refreshNegotiation(negRec.nuid,'buy');
    return negRec.nuid;
  },
  remoteTransition: function(buyerId,transition,parameters) {
    // This is called with this as the negotiation document!
    if (buyerId!==this.bidderId) {
      throw Meteor.Error('access-mismatch','There is a mismatch between current user and user allowed to perform negotiation!!!');
    }
    var conversation = Conversations.findOne({uid: this.cuid});
    var conversationProxy = ConversationProxy.findUserConversationProxy(buyerId,conversation.partnerUID);
    return conversationProxy.doNegotiation(this.uid,transition,_.extend(parameters,{kind: this.kind}));
  },
  webhookUpdate: function(response,negotiation) {
    if (!negotiation) {
      console.log("Finding negotiation: ", {uid: response.nuid, kind: response.kind});
       negotiation = Negotiations.findOne({uid: response.nuid, kind: response.kind});
    }
    if (!negotiation) {
      return false;
    }
    
    console.log("   negotiation = ",negotiation);
    console.log("   response = ",response);
    
    var set = {
      bid: Currency.parseStr(response.bid),
      otherBid: Currency.parseStr(response.other_bid),
      saving: Currency.parseStr(response.saving),
      state: response.state,
      availableTransitions: response.available_transitions,
      successData: response.success_data,
      cancelData: response.cancel_data,
      couponPopupData: response.coupon_popup_data,
      isWaiting: false
    }
    
    var ret = Negotiations.update(negotiation._id,{ $set: set });
    Negotiations.extractMessages(negotiation._id,response.messages,OfferJar.UI.keepAllMessages);
    if (OfferJar.UI.keepHistory) {
      Negotiations.extractHistory(negotiation._id,response.history);
    }
    
    return true;
  },
  refreshNegotiation: function(uid,kind,userId) {
    if (!kind) kind = 'buy';
    var qry = {uid: uid, kind: kind};
    if (userId) {
      qry.bidderId = userId;
    }
    var negotiation = Negotiations.findOne(qry);
    if (negotiation) {
      //console.log("Negotiation: ",negotiation);
      var conversation = Conversations.findOne({uid: negotiation.cuid});
      var conversationProxy = ConversationProxy.findOrCreateUserConversationProxy(negotiation.bidderId,conversation.partnerUID);
      //console.log("ConversationProxy: ",conversationProxy);

      var lastMessage = negotiation.lastMessage();
      var pollParams = { kind: kind };
      if (lastMessage && lastMessage.id) {
        pollParams.last_id = lastMessage.id;
      } else {
        pollParams.last_id = -1;
      }
      var poll = conversationProxy.getNegotiationPoll(uid,pollParams).data;
      if (poll && _.has(poll,'conversation_payload')) {
        Negotiations.webhookUpdate(poll.conversation_payload,negotiation);
      }
    }
  },
  extractMessages: function(negotiationId,messages,keepAll) {
    var lastMessage = _.max(messages, function(message) { return message.id });
    //console.log('lastMessage = ',lastMessage);
    if (!_.isObject(lastMessage)) {
      return lastMessage;
    }
    if (keepAll) {
      NegotiationsMessages.insertIfNotExists(negotiationId,messages);
    } else {
      NegotiationsMessages.update({negotiationId: negotiationId},_.extend({negotiationId: negotiationId},lastMessage),{upsert: true});
    }
    return lastMessage;
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
    if (_.isNull(bid)) bid = undefined;
    if (_.isNull(partnerUID)) partnerUID = undefined;
    console.log("User: ",this.userId," buid = ",buid," bid = ",bid," partnerUID = ",partnerUID);
    check(buid,OfferJar.UI.uidCheck);
    check(bid,Match.Optional(Match.OneOf(Number,Currency.LegalMoneyString)));
    check(partnerUID,Match.Optional(OfferJar.UI.uidCheck));
    return Negotiations.initiateBuyerNegotiation(this.userId,buid,bid,partnerUID);
  },
  refreshNegotiation: function(nuid,kind) {
    if (this.userId===null) {
      throw Meteor.Error("not-allowed","You must be signed-up to perform a negotiation");
    }
    Negotiations.refreshNegotiation(nuid,kind,this.userId);
    return true;
  }
});

_.extend(NegotiationsMessages,{
  insertIfNotExists: function(negotiationId,list) {
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
    },this);
    return counter;
  },
  findForNegotiation: function(negotiationId,options) {
    var defaults = {sort: [['id', 'desc']]};
    if (!options) {
      options = defaults;
    } else {
      _.defaults(options,defaults);
    }
    
    return this.find({negotiationId: negotiationId},options);
  }
});


if (OfferJar.UI.keepHistory) {
  _.extend(NegotiationsHistory,{
    insertIfNotExists: function(negotiationId,list) {
      var historyRec = this.findOne({negotiationId: negotiationId});
      if (!historyRec) {  
        this.insert({
          negotiationId: negotiationId,
          history: list
        });
      } else {
        var idx1 = 0;
        var idx2 = 0;
        var clist = historyRec.history;
        while (idx1<list.length && idx2<clist.length) {
          if (list[idx1][0]>clist[idx2][0]) {
            break;
          } else if (list[idx1][0]<clist[idx2][0]) {
            this.update(historyRec._id), {
              $push: {
                history: {
                  $each: [list[idx1]],
                  $position: idx2
                }
              }
            }
            idx1++;
          } else {
            idx1++;
            idx2++;
          }
        }
        if (idx2<clist.length) {
          // This should not happen we will create a new array!!!
          list  = clist.slice(0,idx2-1).concat(list.slice(idx1));
          this.update(historyRec._id,{
            $set: {
              history: list
            }
          });
        } else if (idx1<list.length) {
          list = list.slice(idx1);
          this.update(historyRec._id,{
            $push: {
              history: {
                $each: list
              }
            }
          })
        } else {
          list = [];
        }
      }
      return list.length;
    }
  });
}
  
Meteor.publish("offerjar.negotiations.info", function(negotiationId) {
  var cursors = [];
  cursors.push(NegotiationsMessages.findForNegotiation(negotiationId));
  if (OfferJar.UI.keepHistory) {
    cursors.push(NegotiationsHistory.find({negotiationId: negotiationId}));
  }
  return cursors;
});


