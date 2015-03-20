// General setup

OfferJar.UI = {
  keepAllMessages: false,
  keepHistory: true
}

function twoOfferJarRecordsEq(rec1,rec2) {
  if (!rec1&&!rec2) {
    return true;
  } else if (!rec1&&rec2 || rec1&&!rec2) {
    return false;
  }
  
  return rec1.uid===rec2.uid;
}

