const FulfillerIdentityProxy = require("./fulfiller_identity_proxy");
const Fulfiller = require("./fulfiller");
let AWSXray = null;

if (process.env.xray === "true") {
  AWSXRay = require("aws-xray-sdk");
} else {
  AWSXRay = require("./aws_xray_mock");
}

/**
 * The main class exposing client methods.
 */
class FulfillerIdentityClient {

  constructor(authorization, options) {
    if (typeof authorization == "string") {
      this.authorizer = { getAuthorization: () => Promise.resolve(authorization) };
    } else if (typeof authorization == "function") {
      this.authorizer = { getAuthorization: () => Promise.resolve(authorization()) };
    } else {
      throw new Error("Ther authorization should be either a string, a function that returns a string, or a function that returns a Promise");
    }
    let url = options.url || "fulfilleridentity.trdlnk.cimpress.io";
    this.fulfillerIdentityProxy = new FulfillerIdentityProxy(url, this.authorizer, AWSXRay);
  }

  /**
   * Returns an array of fulfiller objects that meet the criteria expesses in options
   * @param options Criteria for the query
   */
  getFulfillers(options) {
    let showArchived = (options && options.showArchived) || false;
    let filterByName = options ? options.fulfillerName : null;
    let noCache = (options && options.noCache) || false;

    return this.fulfillerIdentityProxy.callFulfillerIdentity("GET").then((parsedBody) =>
      parsedBody.map(f => new Fulfiller(f.fulfillerId, f.internalFulfillerId, f.name, f.email, f.phone, f.language))
    );
  }

  /**
   * Fetches the fulfiller based on the fulfiller id.
   * @param fulfillerId One of the fulfiller identifiers
   * @param options
   */
  getFulfiller(fulfillerId, options) {
    let noCache = (options && options.noCache) || false;

    return this.fulfillerIdentityProxy.callFulfillerIdentity("GET", { fulfillerId: fulfillerId }).then((f) =>
      new Fulfiller(f.fulfillerId, f.internalFulfillerId, f.name, f.email, f.phone, f.language)
    ).catch((err) => err);
  }

  /**
   * Saves changes made to a fulfiller object.
   * @param fulfiller Fufiller object, either retrieved via getFulfiller or getFulfillers or using new Fulfiller statement
   */
  saveFulfiller(fulfiller) {
    if (fulfiller.fulfillerId || fulfiller.internalFulfillerId) {
      return this.fulfillerIdentityProxy.callFulfillerIdentity("PUT", {
        fulfillerId: fulfiller.fulfillerId || fulfiller.internalFulfillerId,
        data: fulfiller
      }).then((f) => Promise.resolve(), (err) => Promise.reject(new Error("Unable to update fulfiller: " + err.message)));
    } else {
      return this.fulfillerIdentityProxy.callFulfillerIdentity("POST", { data: fulfiller }).then((f) => Promise.resolve(),
        (err) => Promise.reject(new Error("Unable to update fulfiller: " + err.message)))
    }
  }

}

module.exports = FulfillerIdentityClient;