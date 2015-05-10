var routingDefaults = {
  resourceName: 'negotiations',
  actions: {
    new: {
      name: 'new',
      path: '/new'
    },
    show: {
      name: 'show',
      path: '/:nuid'
    }
  },
  controller: 'OfferJarController',
  layoutTemplate: null,
  loadingTemplate: 'OfferJarLoading',
  loginErrorTamplate: 'OfferJarLoginError',
  errorTemplate: 'OfferJarError',
  template: 'Negotiation',
  regions: {}
}

var routingOptionsPattern = {
  resourceName: Match.Optional(String),
  actions: Match.Optional({
    new: Match.Optional({
      name: Match.Optional(String),
      path: Match.Optional(String)
    }),
    show: Match.Optional({
      name: Match.Optional(String),
      path: Match.Optional(String)
    })
  }),
  controller: Match.Optional(String),
  layoutTemplate: Match.Optional(Match.OneOf(null,String)),
  template: Match.Optional(String),
  loadingTemplate: Match.Optional(String),
  loginErrorTamplate: Match.Optional(String),
  errorTemplate: Match.Optional(String),
  regions: Match.Optional({})
}

var optionsRecursiveDefaults = function(options,defaults) {
  _.each(defaults,function(val,key) {
    if (!_.has(options,'key')) {
      options[key] = val;
    } else if (_.isObject(val)) {
      optionsRecursiveDefaults(options[key],val);
    }
  });
  return options;
}


OfferJar.UI.Routing = function(router,options) {
    if (!options) {
      options = routingDefaults;
    } else {
      check(options,routingOptionsPattern)
      optionsRecursiveDefaults(options,routingDefaults);
    }
    _.extend(this,options);
    this.setup(router);
}
    
_.extend(OfferJar.UI.Routing.prototype,{
  // Setup all data
  setup: function(router) {
    _.each(this.actions,function(route,action) {
      var routeOptions = {
        name: this.actionRouteName(action),
        controller: this.controller,
        action: this[action]
      };
      if (this.layoutTemplate) {
        routeOptions.layoutTemplate = this.layoutTemplate
      }
      var r = router.route(this.resourceName + route.path,routeOptions);
      r.offerjarRouting = this;
    },this);
  },
  
  actionRouteName: function(action) {
    return this.resourceName + '.' + this.actions[action].name;
  },
  
  // New never renders anything, it initiate the negotiation and
  // redirect to showing it
  'new': function() {
    var query = this.params.query;
    var ojRouting = this.route.offerjarRouting;
    var self = this;
    check(query,Match.ObjectIncluding({buid: String}));
    Negotiations.initiateBuyerNegotiation(query.buid,query.bid,query.puid,function(error,result) {
      if (error) throw error;
      Router.go(ojRouting.actionRouteName('show'),{nuid: result});
    });
    self.render(ojRouting.loadingTemplate);
  },
  
  show: function() {
    var nuid = this.params.nuid;
    var ojRouting =  this.route.offerjarRouting;
    var self = this;

    var negotiation = Negotiations.findOne({uid: nuid});
    OfferJar.UI.currentNegotiation.set(negotiation);
    ojRouting.renderRegions(this);
    if (negotiation && (!negotiation.lastMessage() || negotiation.currentState()=="waiting")) {
      var timeout =  500;
      Meteor.setTimeout(function() {
        Meteor.call('refreshNegotiation',negotiation.uid);
      },timeout);
    }
  },
  
  // This is the main function used to render the negotiation layout
  renderRegions: function(controller) {
    controller.render(this.template);
    
    _.each(this.regions,function(template,region) {
      controller.render(template,{ to: region});
    });
  }
});