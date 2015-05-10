// General setup

OfferJar.UI = {
  keepAllMessages: false,
  keepHistory: true,
  loginSetup: {
    allowSetUser: 'anonymous',
    transferAffinity: false
  }
}

twoOfferJarRecordsEq = function(/* Arguments */) {
  var fields = _.toArray(arguments);
  
  return function(rec1,rec2) {
    if (!rec1&&!rec2) {
      return true;
    } else if (!rec1&&rec2 || rec1&&!rec2) {
      return false;
    }
    
    return _.all(fields,function(fld) { return rec1[fld]===rec2[fld] });
  }
}

PartnerProxy = OfferJar.PartnerProxy;