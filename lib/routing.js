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
  layout: null,
  template: 'NegotiationDialog',
  regions: {
    productDetails: 'NegotiaionProduct',
    messages: 'NegotiationMessages',
    history: 'NegotiationHistory'
  }
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
  layout: Match.Optional(String),
  template: Match.Optional(String),
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
        action: this[action],
        layoutTemplate: this.layout
      };
      var r = router.route(this.resourceName + route.path,routeOptions);
      r.offerjarRouting = this;
    },this);
  },
  
  actionRouteName: function(action) {
    return this.resourceName + '.' + this.actions[action].name;
  },
  
  // New never renders anything, it initiate the negotiation and
  // redirect to showing it
  new: function() {
    var query = this.params.query;
    var ojRouting = this.offerjarRouting;
    check(query,Match.ObjectIncluding({buid: String}));
    var button = Buttons.findOrDownloadButton(query.buid);
    if (!_.isNull(button)) {
      Negotiations.initiateBuyerNegotiation(query.buid,query.bid,query.puid,function(error,result) {
        if (error) throw error;
        Router.go(this.offerjarRouting.actionRouteName(show),{nuid: result.data});
      });
    }
    OfferJar.UI.currentButton.set(button);
    ojRouting.renderRegions(this);
  },
  
  show: function() {
    var nuid = this.params.nuid;
    var ojRouting = this.offerjarRouting;
    
    OfferJar.UI.currentNegotiation.set(Negotiations.findOne({uid: nuid}));
    
    Tracker.autorun(function () {
      var negotiation = OfferJar.UI.currentNegotiation.get();
      if (_.isObject(negotiation)) {
        OfferJar.UI.currentButton.set(Buttons.findOrDownloadButton(negotiation.buid));
      }
    });
    
    ojRouting.renderRegions(this);
  },
  
  // This is the main function used to render the negotiation layout
  renderRegions: function(controller) {
    controller.render(this.template);
    
    _.each(this.regions,function(template,region) {
      controller.render(template,{ to: region});
    });
  }
});