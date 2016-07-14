/*
 * Copyright 2015 Telefónica Investigación y Desarrollo, S.A.U
 *
 * This file is part of the Short Time Historic (STH) component
 *
 * STH is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * STH is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with STH.
 * If not, see http://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with: [german.torodelvalle@telefonica.com]
 */

'use strict';

var sthDatabase = require('../../lib/sth_database');
var sthConfig = require('../../lib/sth_configuration');
var sthHelper = require('../../lib/sth_helper');
var sthTestConfig = require('./sth_test_configuration');
var expect = require('expect.js');
var _ = require('lodash');

var COLLECTION_NAMES = sthConfig.COLLECTION_PREFIX + 'collection_names';
var DATABASE_NAME = sthDatabase.getDatabaseName(sthConfig.DEFAULT_SERVICE);
var DATABASE_CONNECTION_PARAMS = {
  authentication: sthConfig.DB_AUTHENTICATION,
  dbURI: sthConfig.DB_URI,
  replicaSet: sthConfig.REPLICA_SET,
  database: DATABASE_NAME,
  poolSize: sthConfig.POOL_SIZE
};
var COLLECTION_NAME_PARAMS = {
  service: sthConfig.DEFAULT_SERVICE,
  servicePath: sthConfig.DEFAULT_SERVICE_PATH,
  entityId: sthTestConfig.ENTITY_ID,
  entityType: sthTestConfig.ENTITY_TYPE,
  attrName: sthTestConfig.ATTRIBUTE_NAME,
  attrType: sthTestConfig.ATTRIBUTE_TYPE
};
var NUMERIC_COLLECTION_NAME_PARAMS = {
  service: sthConfig.DEFAULT_SERVICE,
  servicePath: sthConfig.DEFAULT_SERVICE_PATH,
  entityId: sthTestConfig.ENTITY_ID,
  entityType: sthTestConfig.ENTITY_TYPE,
  attrName: sthTestConfig.ATTRIBUTE_NAME + sthConfig.AGGREGATIONS.NUMERIC,
  attrType: sthTestConfig.ATTRIBUTE_TYPE
};
var TEXTUAL_COLLECTION_NAME_PARAMS = {
  service: sthConfig.DEFAULT_SERVICE,
  servicePath: sthConfig.DEFAULT_SERVICE_PATH,
  entityId: sthTestConfig.ENTITY_ID,
  entityType: sthTestConfig.ENTITY_TYPE,
  attrName: sthTestConfig.ATTRIBUTE_NAME + sthConfig.AGGREGATIONS.TEXTUAL,
  attrType: sthTestConfig.ATTRIBUTE_TYPE
};
var VERY_LONG_COLLECTION_NAME_PARAMS = {
  service: sthConfig.DEFAULT_SERVICE,
  servicePath: sthConfig.DEFAULT_SERVICE_PATH + sthConfig.DEFAULT_SERVICE_PATH + sthConfig.DEFAULT_SERVICE_PATH +
    sthConfig.DEFAULT_SERVICE_PATH + sthConfig.DEFAULT_SERVICE_PATH + sthConfig.DEFAULT_SERVICE_PATH +
    sthConfig.DEFAULT_SERVICE_PATH,
  entityId: sthTestConfig.ENTITY_ID,
  entityType: sthTestConfig.ENTITY_TYPE,
  attrName: sthTestConfig.ATTRIBUTE_NAME,
  attrType: sthTestConfig.ATTRIBUTE_TYPE
};
var DATE = new Date(Date.UTC(1970, 1, 3, 4, 5, 6, 777));
var DELAY = 100;
var LIMIT = 10;
var PAGINATION = 0;
var ATTRIBUTE = {
  VALUE: {
    NUMERIC: 666
  }
};
var STORE_DATA_PARAMS = {
  recvTime: DATE,
  entityId: sthTestConfig.ENTITY_ID,
  entityType: sthTestConfig.ENTITY_TYPE,
  attribute: {
    name: sthTestConfig.ATTRIBUTE_NAME,
    type: sthTestConfig.ATTRIBUTE_TYPE
  }
};
var RETRIEVAL_DATA_PARAMS = {
  entityId: sthTestConfig.ENTITY_ID,
  entityType: sthTestConfig.ENTITY_TYPE,
  attrName: sthTestConfig.ATTRIBUTE_NAME
};

/**
 * Connects to the database and returns the database connection asynchronously
 * @param  {Function} callback The callblack
 */
function connectToDatabase(callback) {
  if (sthDatabase.connection) {
    return process.nextTick(callback.bind(null, null, sthDatabase.connection));
  }
  sthDatabase.connect(DATABASE_CONNECTION_PARAMS, callback);
}

/**
 * Drops a database collection for the provided data type and model asynchronously
 * @param  {object}   collectionNameParams The collection name params
 * @param  {string}   dataType             The data type
 * @param  {string}   dataModel            The data model
 * @param  {Function} callback             The callback
 */
function dropCollection(collectionNameParams, dataType, dataModel, callback) {
  sthConfig.DATA_MODEL = dataModel;
  var collectionName = (dataType === sthTestConfig.DATA_TYPES.RAW) ?
    sthDatabase.getCollectionName4Events(collectionNameParams) :
    sthDatabase.getCollectionName4Aggregated(collectionNameParams);

  if (collectionName) {
    sthDatabase.connection.dropCollection(collectionName, function (err) {
      if (err && err.code === 26 && err.name === 'MongoError' && err.message === 'ns not found') {
        // The collection does not exist
        return process.nextTick(callback);
      }
      return process.nextTick(callback.bind(null, err));
    });
  } else {
    return process.nextTick(callback);
  }
}

/**
 * Drops the collection hash to name collectionName
 * @param  {Function} callback The callback
 */
function dropCollectionNamesCollection(callback) {
  sthDatabase.connection.dropCollection(COLLECTION_NAMES, function (err) {
    if (err && err.code === 26 && err.name === 'MongoError' && err.message === 'ns not found') {
      // The collection does not exist
      return process.nextTick(callback);
    }
    return process.nextTick(callback.bind(null, err));
  });
}

/**
 * Set of tests to drop the test collections from the database
 */
function cleanDatabaseTests(shouldHash) {
  var ORIGINAL_SHOULD_HASH,
      dataModelsKeys = Object.keys(sthConfig.DATA_MODELS),
      dataTypeKeys = Object.keys(sthTestConfig.DATA_TYPES);

  describe('database clean up', function() {
    before(function() {
      ORIGINAL_SHOULD_HASH = sthConfig.SHOULD_HASH;
      sthConfig.SHOULD_HASH = shouldHash;
    });

    dataModelsKeys.forEach(function(dataModel) {
      dataTypeKeys.forEach(function(dataType) {
        it('should drop the ' + sthConfig.DATA_MODELS[dataModel] + ' ' + sthTestConfig.DATA_TYPES[dataType] +
          ' data collection if it exists',
          dropCollection.bind(null, COLLECTION_NAME_PARAMS, sthTestConfig.DATA_TYPES[dataType],
            sthConfig.DATA_MODELS[dataModel]));

        it('should drop the numeric ' + sthConfig.DATA_MODELS[dataModel] + ' ' + sthTestConfig.DATA_TYPES[dataType] +
          ' data collection if it exists',
          dropCollection.bind(null, NUMERIC_COLLECTION_NAME_PARAMS, sthTestConfig.DATA_TYPES[dataType],
            sthConfig.DATA_MODELS[dataModel]));

        it('should drop the textual ' + sthConfig.DATA_MODELS[dataModel] + ' ' + sthTestConfig.DATA_TYPES[dataType] +
          ' data collection if it exists',
          dropCollection.bind(null, TEXTUAL_COLLECTION_NAME_PARAMS, sthTestConfig.DATA_TYPES[dataType],
            sthConfig.DATA_MODELS[dataModel]));

        it('should drop the very long service path ' + sthConfig.DATA_MODELS[dataModel] + ' ' +
          sthTestConfig.DATA_TYPES[dataType] + ' data collection if it exists',
          dropCollection.bind(null, VERY_LONG_COLLECTION_NAME_PARAMS, sthTestConfig.DATA_TYPES[dataType],
            sthConfig.DATA_MODELS[dataModel]));
      });
    });

    it('should drop the ' + COLLECTION_NAMES + ' if it exists',
      dropCollectionNamesCollection);

    after(function() {
      sthConfig.SHOULD_HASH = ORIGINAL_SHOULD_HASH;
    });
  });
}

/**
 * Expectations for the collection name generation
 * @param  {string} collectionNameParams The collection name params
 * @param  {string} collectionName       The collection name
 * @param  {string} dataType             The data type
 * @param  {string} dataModel            The data model
 */
function expectCollectionName(collectionNameParams, collectionName, dataType, dataModel) {
  var concatRawCollectionName, finalCollectionName;
  switch (dataModel) {
    case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
      concatRawCollectionName = collectionNameParams.servicePath + '_' +
        collectionNameParams.entityId + '_' + collectionNameParams.entityType + '_' +
        collectionNameParams.attrName;
      break;
    case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
      concatRawCollectionName = collectionNameParams.servicePath + '_' +
        collectionNameParams.entityId + '_' + collectionNameParams.entityType;
      break;
    case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
      concatRawCollectionName = collectionNameParams.servicePath;
      break;
    default:
    throw new Error(dataModel + ' is not a valid data model value');
  }

  if (sthConfig.SHOULD_HASH) {
    finalCollectionName =
      sthConfig.COLLECTION_PREFIX +
      sthDatabase.generateHash(concatRawCollectionName, sthDatabase.getHashSizeInBytes(DATABASE_NAME)) +
      (dataType === sthTestConfig.DATA_TYPES.AGGREGATED ? '.aggr' : '');
    expect(collectionName).to.equal(finalCollectionName);
  } else {
    finalCollectionName = sthConfig.COLLECTION_PREFIX +
      concatRawCollectionName + (dataType === sthTestConfig.DATA_TYPES.AGGREGATED ? '.aggr' : '');
    expect(collectionName).to.equal(finalCollectionName);
  }
}

/**
 * Expectations for the collection name storage if hashing is requested
 * @param  {object}   params Params object including the following properties:
 *                             - {object} collectionNameParams The collection name params
 *                             - {object} collection           The collection
 *                             - {string} dataType            The data type
 * @param  {Function} callback   The callback
 */
function expectCollectionHashNameIsStored(params, callback) {
  sthDatabase.connection.collection(COLLECTION_NAMES, {strict: true},
    function(err, collectionNamesCollection) {
      if (err) {
        return callback(err);
      }
      expect(err).to.be(null);
      expect(collectionNamesCollection).to.not.be(null);
      collectionNamesCollection.find({'_id': params.collection.s.name}).toArray(function(err, results) {
        if (err) {
          return callback(err);
        }
        expect(err).to.be(null);
        expect(results).to.not.be(null);
        expect(results.length).to.equal(1);
        expect(results[0].dataModel).to.equal(sthConfig.DATA_MODEL);
        expect(results[0].isAggregated).to.equal(params.dataType === sthTestConfig.DATA_TYPES.AGGREGATED);
        switch(sthConfig.DATA_MODEL) {
          case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
            expect(results[0].attrName).to.equal(params.collectionNameParams.attrName);
            expect(results[0].attrType).to.equal(params.collectionNameParams.attrType);
          /* falls through */
          case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
            expect(results[0].entityId).to.equal(params.collectionNameParams.entityId);
            expect(results[0].entityType).to.equal(params.collectionNameParams.entityType);
          /* falls through */
          case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
            expect(results[0].service).to.equal(params.collectionNameParams.service);
            expect(results[0].servicePath).to.equal(params.collectionNameParams.servicePath);
        }
        return callback();
      });
    }
  );
}

/**
 * Battery of tests to check that the naming of the collections works as expected
 * @param  {boolean} shouldHash Flag indicating if hashing should be used in the collection names
 */
function collectionNameTests(shouldHash) {
  var ORIGINAL_DATA_MODEL = sthConfig.DATA_MODEL,
      ORIGINAL_SHOULD_HASH = sthConfig.SHOULD_HASH,
      dataTypes = Object.keys(sthTestConfig.DATA_TYPES),
      dataModels = Object.keys(sthConfig.DATA_MODELS);

  before(function() {
    sthConfig.SHOULD_HASH = shouldHash;
  });

  dataModels.forEach(function(dataModel) {
    describe(sthConfig.DATA_MODELS[dataModel] + ' data model', function() {
      before(function() {
        sthConfig.DATA_MODEL = sthConfig.DATA_MODELS[dataModel];
      });

      dataTypes.forEach(function(dataType) {
        it('should compose the collection name for ' + sthTestConfig.DATA_TYPES[dataType] + ' data',
          function(done) {
            var collectionName = sthTestConfig.DATA_TYPES[dataType] === sthTestConfig.DATA_TYPES.RAW ?
              sthDatabase.getCollectionName4Events(COLLECTION_NAME_PARAMS) :
              sthDatabase.getCollectionName4Aggregated(COLLECTION_NAME_PARAMS);
            expectCollectionName(
              COLLECTION_NAME_PARAMS, collectionName, sthTestConfig.DATA_TYPES[dataType],
              sthConfig.DATA_MODELS[dataModel]);
            done();
          }
        );

        it('should compose (or not) the collection name for ' +
          sthTestConfig.DATA_TYPES[dataType] + ' data if very long service path and hashing is enabled (or disabled)',
          function(done) {
            var collectionName = sthTestConfig.DATA_TYPES[dataType] === sthTestConfig.DATA_TYPES.RAW ?
              sthDatabase.getCollectionName4Events(VERY_LONG_COLLECTION_NAME_PARAMS) :
              sthDatabase.getCollectionName4Aggregated(VERY_LONG_COLLECTION_NAME_PARAMS);
            if (sthConfig.SHOULD_HASH) {
              expectCollectionName(
                VERY_LONG_COLLECTION_NAME_PARAMS, collectionName, sthTestConfig.DATA_TYPES[dataType],
                sthConfig.DATA_MODELS[dataModel]);
            } else {
              expect(collectionName).to.be(null);
            }
            done();
          }
        );
      });

      after(function() {
        sthConfig.DATA_MODEL = ORIGINAL_DATA_MODEL;
      });
    });
  });

  after(function() {
    sthConfig.SHOULD_HASH = ORIGINAL_SHOULD_HASH;
  });
}

/**
 * Battery of tests to check that the access to the collections works as expected
 * @param  {boolean} shouldHash Flag indicating if hashing should be used in the collection names
 */
function collectionAccessTests(shouldHash) {
  var ORIGINAL_DATA_MODEL = sthConfig.DATA_MODEL,
      ORIGINAL_SHOULD_HASH = sthConfig.SHOULD_HASH,
      dataTypes = Object.keys(sthTestConfig.DATA_TYPES),
      dataModels = Object.keys(sthConfig.DATA_MODELS);

  before(function() {
    sthConfig.SHOULD_HASH = shouldHash;
  });

  cleanDatabaseTests(shouldHash);

  dataModels.forEach(function(dataModel) {
    describe(sthConfig.DATA_MODELS[dataModel] + ' data model', function() {
      before(function() {
        sthConfig.DATA_MODEL = sthConfig.DATA_MODELS[dataModel];
      });

      dataTypes.forEach(function(dataType) {
        it('should notify as error a non-existent ' + sthTestConfig.DATA_TYPES[dataType] +
          ' data collection if it should not be created', function(done) {
          sthDatabase.getCollection(
            COLLECTION_NAME_PARAMS,
            {
              shouldCreate: false,
              isAggregated: sthTestConfig.DATA_TYPES[dataType] === sthTestConfig.DATA_TYPES.AGGREGATED,
              shouldStoreHash: sthConfig.SHOULD_HASH,
              shouldTruncate: false
            },
            function(err, collection) {
              expect(err).to.not.be(null);
              expect(err.name).to.equal('MongoError');
              expect(err.message.indexOf('does not exist. Currently in strict mode.')).to.be.above(0);
              expect(collection).to.be(null);
              done();
            }
          );
        });

        it('should create (or notify as error) a ' + sthTestConfig.DATA_TYPES[dataType] +
          ' data collection if non-existent and requested if very long service path and hashing is enabled ' +
          '(or disabled)', function(done) {
          sthDatabase.getCollection(
            VERY_LONG_COLLECTION_NAME_PARAMS,
            {
              shouldCreate: true,
              isAggregated: sthTestConfig.DATA_TYPES[dataType] === sthTestConfig.DATA_TYPES.AGGREGATED,
              shouldStoreHash: sthConfig.SHOULD_HASH,
              shouldTruncate: false
            },
            function(err, collection) {
              if (sthConfig.SHOULD_HASH) {
                expect(err).to.be(null);
                expect(collection).to.be.ok();
                expectCollectionHashNameIsStored(
                  {
                    collectionNameParams: VERY_LONG_COLLECTION_NAME_PARAMS,
                    collection: collection,
                    dataType: sthTestConfig.DATA_TYPES[dataType]
                  },
                  function(err) {
                    return done(err);
                  }
                );
              } else {
                expect(err).to.not.be(null);
                expect(err.name).to.equal('Error');
                expect(err.message).to.equal('The collection name could not be generated');
                expect(collection).to.be(undefined);
                return done();
              }
            }
          );
        });

        it('should create a ' + sthTestConfig.DATA_TYPES[dataType] +
          ' data collection if non-existent and requested', function(done) {
          sthDatabase.getCollection(
            COLLECTION_NAME_PARAMS,
            {
              shouldCreate: true,
              isAggregated: sthTestConfig.DATA_TYPES[dataType] === sthTestConfig.DATA_TYPES.AGGREGATED,
              shouldStoreHash: sthConfig.SHOULD_HASH,
              shouldTruncate: false
            },
            function(err, collection) {
              expect(err).to.be(null);
              expect(collection).to.be.ok();
              if (sthConfig.SHOULD_HASH) {
                expectCollectionHashNameIsStored(
                  {
                    collectionNameParams: COLLECTION_NAME_PARAMS,
                    collection: collection,
                    dataType: sthTestConfig.DATA_TYPES[dataType]
                  },
                  function(err) {
                    return done(err);
                  }
                );
              } else {
                return done();
              }
            }
          );
        });

        it('should notify (or not) as error a hash collision for a ' + sthTestConfig.DATA_TYPES[dataType] +
          ' data collection if hashing is enabled (or disabled)', function(done) {
          dropCollection(COLLECTION_NAME_PARAMS, sthTestConfig.DATA_TYPES[dataType], sthConfig.DATA_MODELS[dataModel],
            function(err) {
              if (err) {
                return done(err);
              }
              sthDatabase.getCollection(
                COLLECTION_NAME_PARAMS,
                {
                  shouldCreate: true,
                  isAggregated: sthTestConfig.DATA_TYPES[dataType] === sthTestConfig.DATA_TYPES.AGGREGATED,
                  shouldStoreHash: sthConfig.SHOULD_HASH,
                  shouldTruncate: false
                },
                function(err, collection) {
                  if (sthConfig.SHOULD_HASH) {
                    expect(err).to.not.be(null);
                    expect(err.name).to.equal('Error');
                    expect(err.message).to.equal('Collection name hash collision');
                    // In case of a hash collision, the created collection is returned
                    expect(collection).to.not.be(null);
                    done();
                  } else {
                    expect(err).to.be(null);
                    expect(collection).to.be.ok();
                    return done();
                  }
                }
              );
            }
          );

        });
      });

      after(function() {
        sthConfig.DATA_MODEL = ORIGINAL_DATA_MODEL;
      });
    });
  });

  after(function() {
    sthConfig.SHOULD_HASH = ORIGINAL_SHOULD_HASH;
  });
}

/**
 * Returns the aggregated entry or point for certain offset
 * @param {Array} points The array of points
 * @param {Number} offset The offset
 */
function getAggregatedEntry4Offset(points, offset) {
  for (var index = 0; index < points.length; index++) {
    if (points[index].offset === offset) {
      return points[index];
    }
  }
}

/**
 * Returns the query to be used in the data stored Expectations
 * @param  {string} dataType        The data type
 * @param  {string} aggregation The aggregation type
 * @return {object}                 The query object
 */
function getQuery4ExpectDataStored(dataType, aggregation) {
  if (sthConfig.DATA_MODEL === sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH ||
    sthConfig.DATA_MODEL === sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY) {
      if (dataType === sthTestConfig.DATA_TYPES.RAW) {
        return {'attrName': STORE_DATA_PARAMS.attribute.name + aggregation};
      } else {
        return {'_id.attrName': STORE_DATA_PARAMS.attribute.name + aggregation};
      }
  } else {
    return {};
  }
}

/**
 * No retrieval results expectations
 * @param  {object} params     Parameter object including the following properties:
 *                               - {object} collection         The collection, if any
 *                               - {string} aggregation        The aggregation type
 *                               - {string} dataType           The data type
 *                               - {string} limit              The number of results limit
 *                               - {string} resolution         The resolution, if any
 *                               - {string} aggregatedFunction The resolution, if any
 * @param  {number} count      The number of stored data entries
 * @param  {Array}  result     The result array
 * @param  {Function} callback The callback
 */
function expectResult(params, count, result, callback) {
  if (!Array.isArray(result)) {
    expect(typeof result).to.be('string');
    return callback();
  }
  if (count === 0) {
    expect(result.length).to.be(0);
    return callback();
  } else {
    if (params.dataType === sthTestConfig.DATA_TYPES.RAW) {
      expect(result.length).to.equal(params.limit ? Math.min(params.limit, count) : count);
      for (var i = 0; i < count; i++) {
        switch (sthConfig.DATA_MODEL) {
          case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
            if (params.collection) {
              expect(result[i].entityId).to.equal(STORE_DATA_PARAMS.entityId);
              expect(result[i].entityType).to.equal(STORE_DATA_PARAMS.entityType);
            }
          /* falls through */
          case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
            if (params.collection) {
              expect(result[i].attrName).to.equal(STORE_DATA_PARAMS.attribute.name + params.aggregation);
            }
            expect(result[i].attrType).to.equal(STORE_DATA_PARAMS.attribute.type);
          /* falls through */
          case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
            expect(result[i].recvTime.getTime()).to.equal(DATE.getTime() + (i * DELAY));
            expect(result[i].attrValue).to.equal(
              params.aggregation === sthConfig.AGGREGATIONS.NUMERIC ?
                ATTRIBUTE.VALUE.NUMERIC : sthConfig.DATA_MODEL);
            break;
          default:
            return callback(new Error('Invalid data model: ' + sthConfig.DATA_MODEL));
        }
      }
      return callback();
    } else {
      expect(result.length).to.equal(!params.resolution ? sthConfig.AGGREGATION_BY.length : 1);
      for (var j = 0; j < result.length; j++) {
        switch (sthConfig.DATA_MODEL) {
          case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
            expect(result[j]._id.entityId).to.equal(STORE_DATA_PARAMS.entityId);
            expect(result[j]._id.entityType).to.equal(STORE_DATA_PARAMS.entityType);
          /* falls through */
          case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
            expect(result[j]._id.attrName).to.equal(STORE_DATA_PARAMS.attribute.name + params.aggregation);
            if (params.collection) {
              expect(result[j].attrType).to.equal(STORE_DATA_PARAMS.attribute.type);
              // The previous line should be substituted by the next one when this bug is solved:
              // expect(result[i]._id.attrType).to.equal(STORE_DATA_PARAMS.attribute.type);
            }
          /* falls through */
          case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
            expect(result[j]._id.origin.getTime()).to.equal(
              sthHelper.getOrigin(STORE_DATA_PARAMS.recvTime, result[j]._id.resolution).getTime());
            var point = getAggregatedEntry4Offset(result[j].points,
            sthHelper.getOffset(result[j]._id.resolution, STORE_DATA_PARAMS.recvTime));
            expect(point.samples).to.equal(count);
            switch (params.aggregatedFunction) {
              case 'sum':
                expect(point.sum).to.equal(ATTRIBUTE.VALUE.NUMERIC * count);
                break;
              case 'sum2':
                expect(point.sum2).to.equal(Math.pow(ATTRIBUTE.VALUE.NUMERIC, 2) * count);
                break;
              case 'min':
                expect(point.min).to.equal(ATTRIBUTE.VALUE.NUMERIC);
                break;
              case 'max':
                expect(point.max).to.equal(ATTRIBUTE.VALUE.NUMERIC);
                break;
              case 'occur':
                expect(point.occur[sthConfig.DATA_MODEL]).to.equal(count);
                break;
              default:
                if (params.aggregation === sthConfig.AGGREGATIONS.NUMERIC) {
                  expect(point.sum).to.equal(ATTRIBUTE.VALUE.NUMERIC * count);
                  expect(point.sum2).to.equal(Math.pow(ATTRIBUTE.VALUE.NUMERIC, 2) * count);
                  expect(point.min).to.equal(ATTRIBUTE.VALUE.NUMERIC);
                  expect(point.max).to.equal(ATTRIBUTE.VALUE.NUMERIC);
                } else {
                  expect(point.occur[sthConfig.DATA_MODEL]).to.equal(count);
                }
            }
            break;
          default:
            return callback(new Error('Invalid data model: ' + sthConfig.DATA_MODEL));
        }
      }
      return callback();
    }
  }
}

/**
 * Expectations for the data storage
 * @param {object}   params   Params object including the following properties:
 *                               - {object} collection  The collection
 *                               - {string} dataType    The data type
 *                               - {string} aggregation The aggregation type
 * @param {number}   count    The number of stored entries
 * @param {Function} callback The callback
 */
function expectDataStored(params, count, callback) {
  params.collection.find(getQuery4ExpectDataStored(params.dataType, params.aggregation)).toArray(
    function(err, result) {
      if (err) {
        return callback(err);
      }
      expectResult(params, count, result, callback);
    }
  );
}

/**
 * Composes and returns the params used for data storage
 * @param  {object} collection  The collection where data will be stored
 * @param  {string} aggregation The aggregation type
 */
function getDataStoreParams(collection, aggregation) {
  var dataStoreParams = _.cloneDeep(STORE_DATA_PARAMS);
  dataStoreParams.collection = collection;
  dataStoreParams.attribute.name += aggregation;
  dataStoreParams.attribute.value = (aggregation === sthConfig.AGGREGATIONS.NUMERIC ?
    ATTRIBUTE.VALUE.NUMERIC : sthConfig.DATA_MODEL);
  return dataStoreParams;
}

/**
 * Expectations regarding the existence of some raw data
 * @param  {object} notificationInfoParams The notification info params
 * @param  {object} notificationInfo       The notification info
 * @param  {string} dataModel              The data model
 */
function expectExistsNotificationInfo(notificationInfoParams, notificationInfo, dataModel) {
  switch (dataModel) {
    case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
      expect(notificationInfo.exists).to.have.property('entityId', notificationInfoParams.entityId);
      expect(notificationInfo.exists).to.have.property('entityType', notificationInfoParams.entityType);
    /* falls through */
    case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
      expect(notificationInfo.exists).to.have.property('attrName', notificationInfoParams.attribute.name);
    /* falls through */
    case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
      expect(notificationInfo.exists).to.have.property('_id');
      expect(notificationInfo.exists.recvTime.getTime()).to.equal(DATE.getTime());
      expect(notificationInfo.exists).to.have.property('attrType', notificationInfoParams.attribute.type);
      expect(notificationInfo.exists).to.have.property('attrValue', notificationInfoParams.attribute.value);
  }
}

/**
 * Expectations regarding the update of some raw data
 * @param  {object} notificationInfoParams The notification info params
 * @param  {object} notificationInfo       The notification info
 * @param  {string} dataModel              The data model
 * @param  {string} aggregation            The aggregation type
 */
function expectUpdatesNotificationInfo(notificationInfoParams, notificationInfo, dataModel, aggregation) {
  switch (dataModel) {
    case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
      expect(notificationInfo.updates).to.have.property('entityId', notificationInfoParams.entityId);
      expect(notificationInfo.updates).to.have.property('entityType', notificationInfoParams.entityType);
    /* falls through */
    case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
      expect(notificationInfo.updates).to.have.property('attrName', notificationInfoParams.attribute.name);
    /* falls through */
    case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
      expect(notificationInfo.updates).to.have.property('_id');
      expect(notificationInfo.updates.recvTime.getTime()).to.equal(DATE.getTime());
      expect(notificationInfo.updates).to.have.property('attrType', notificationInfoParams.attribute.type);
      expect(notificationInfo.updates).to.have.property('attrValue', notificationInfoParams.attribute.value);
  }
  if (aggregation === sthConfig.AGGREGATIONS.NUMERIC) {
    sthConfig.AGGREGATION_BY.forEach(function(aggregationBy) {
      expect(notificationInfo.newMinValues[aggregationBy]).to.equal(notificationInfoParams.attribute.value);
    });
  }
}

/**
 * The should store tests
 * @param  {string}   aggregation The aggregation type
 * @param  {string}   dataType    The data type
 * @param  {number}   position    The timing position in which the data is being inserted
 * @param  {Function} done        The done() function
 */
function shouldStoreTest(aggregation, dataType, position, done) {
  sthDatabase.getCollection(
    (aggregation === sthConfig.AGGREGATIONS.NUMERIC ?
      NUMERIC_COLLECTION_NAME_PARAMS :
      TEXTUAL_COLLECTION_NAME_PARAMS),
    {
      shouldCreate: true,
      isAggregated: dataType === sthTestConfig.DATA_TYPES.AGGREGATED,
      shouldStoreHash: sthConfig.SHOULD_HASH,
      shouldTruncate: false
    },
    function(err, collection) {
      if (err) {
        return done(err);
      }
      var storeDataParams = getDataStoreParams(collection, aggregation);
      storeDataParams.recvTime = new Date(DATE.getTime() + (position - 1) * DELAY);
      storeDataParams.notificationInfo = {inserts: true};
      if (dataType === sthTestConfig.DATA_TYPES.RAW) {
        sthDatabase.storeRawData(
          storeDataParams,
          function(err) {
            if (err) {
              return done(err);
            }
            expectDataStored(
              {
                collection: collection,
                dataType: dataType,
                aggregation: aggregation
              },
              position,
              done
            );
          }
        );
      } else {
        sthDatabase.storeAggregatedData(
          storeDataParams,
          function(err) {
            if (err) {
              return done(err);
            }
            expectDataStored(
              {
                collection: collection,
                dataType: dataType,
                aggregation: aggregation
              },
              position,
              done
            );
          }
        );
      }
    }
  );
}

/**
 * Battery of tests to check that the storage of raw and aggregated data works as expected
 * @param  {boolean} shouldHash Flag indicating if hashing should be used in the collection names
 */
function storageTests(shouldHash) {
  var ORIGINAL_DATA_MODEL,
      ORIGINAL_SHOULD_HASH,
      dataTypes = Object.keys(sthTestConfig.DATA_TYPES),
      dataModels = Object.keys(sthConfig.DATA_MODELS),
      aggregations = Object.keys(sthConfig.AGGREGATIONS),
      collection;

  before(function() {
    ORIGINAL_DATA_MODEL = sthConfig.DATA_MODEL;
    ORIGINAL_SHOULD_HASH = sthConfig.SHOULD_HASH;
    sthConfig.SHOULD_HASH = shouldHash;
  });

  cleanDatabaseTests(shouldHash);

  dataModels.forEach(function(dataModel) {
    describe(sthConfig.DATA_MODELS[dataModel] + ' data model', function() {
      before(function() {
        sthConfig.DATA_MODEL = sthConfig.DATA_MODELS[dataModel];
      });

      aggregations.forEach(function(aggregation) {
        describe(sthConfig.AGGREGATIONS[aggregation], function() {
          dataTypes.forEach(function(dataType) {
            describe(sthTestConfig.DATA_TYPES[dataType] + ' data', function() {
              before(function(done) {
                sthDatabase.getCollection(
                  (sthConfig.AGGREGATIONS[aggregation] === sthConfig.AGGREGATIONS.NUMERIC ?
                    NUMERIC_COLLECTION_NAME_PARAMS :
                    TEXTUAL_COLLECTION_NAME_PARAMS),
                  {
                    shouldCreate: true,
                    isAggregated: sthTestConfig.DATA_TYPES[dataType] === sthTestConfig.DATA_TYPES.AGGREGATED,
                    shouldStoreHash: sthConfig.SHOULD_HASH,
                    shouldTruncate: false
                  },
                  function(err, theCollection) {
                    if (err) {
                      return done(err);
                    }
                    collection = theCollection;
                    done();
                  }
                );
              });

              if (sthTestConfig.DATA_TYPES[dataType] === sthTestConfig.DATA_TYPES.RAW) {
                it('should detect a new ' + sthConfig.AGGREGATIONS[aggregation] + ' attribute value notification is ' +
                  'susceptible of being inserted',
                  function(done) {
                    var notificationInfoParams = getDataStoreParams(collection, sthConfig.AGGREGATIONS[aggregation]);
                    sthDatabase.getNotificationInfo(notificationInfoParams, function(err, result) {
                      if (sthTestConfig.DATA_TYPES[dataType] === sthTestConfig.DATA_TYPES.RAW) {
                        expect(err).to.be(null);
                        expect(result).to.eql({inserts: true});
                      }
                      done();
                    });
                  }
                );
              }

              it('should store ' + sthConfig.AGGREGATIONS[aggregation] + ' ' + sthTestConfig.DATA_TYPES[dataType] +
                ' data', shouldStoreTest.bind(null, sthConfig.AGGREGATIONS[aggregation],
                  sthTestConfig.DATA_TYPES[dataType], 1)
              );

              if (sthTestConfig.DATA_TYPES[dataType] === sthTestConfig.DATA_TYPES.RAW) {
                it('should detect an already inserted ' + sthConfig.AGGREGATIONS[aggregation] + ' attribute value ' +
                  'notification already exists',
                  function(done) {
                    var notificationInfoParams = getDataStoreParams(collection, sthConfig.AGGREGATIONS[aggregation]);
                    sthDatabase.getNotificationInfo(notificationInfoParams, function(err, result) {
                      expect(err).to.be(null);
                      expectExistsNotificationInfo(notificationInfoParams, result, sthConfig.DATA_MODELS[dataModel]);
                      done();
                    });
                  }
                );
              }

              it('should store a second entry of ' + sthConfig.AGGREGATIONS[aggregation] + ' ' +
                sthTestConfig.DATA_TYPES[dataType] + ' data with a ' + DELAY + ' ms delay',
                shouldStoreTest.bind(null, sthConfig.AGGREGATIONS[aggregation],
                  sthTestConfig.DATA_TYPES[dataType], 2)
              );

              if (sthTestConfig.DATA_TYPES[dataType] === sthTestConfig.DATA_TYPES.RAW) {
                it('should detect as updatable an updated ' + sthConfig.AGGREGATIONS[aggregation] + ' attribute value',
                  function(done) {
                    var notificationInfoParams = getDataStoreParams(collection, sthConfig.AGGREGATIONS[aggregation]);
                    var updatedNotificationInfoParams = getDataStoreParams(
                      collection, sthConfig.AGGREGATIONS[aggregation]);
                    updatedNotificationInfoParams.attribute.value +=
                      (sthConfig.AGGREGATIONS[aggregation] === sthConfig.AGGREGATIONS.NUMERIC ?
                        ATTRIBUTE.VALUE.NUMERIC : sthConfig.DATA_MODELS[dataModel]);
                    sthDatabase.getNotificationInfo(updatedNotificationInfoParams, function(err, result) {
                      expect(err).to.be(null);
                      expectUpdatesNotificationInfo(notificationInfoParams, result, sthConfig.DATA_MODELS[dataModel],
                        sthConfig.AGGREGATIONS[aggregation]);
                      done();
                    });
                  }
                );
              }
            });
          });
        });
      });

      after(function() {
        sthConfig.DATA_MODEL = ORIGINAL_DATA_MODEL;
      });
    });
  });

  after(function() {
    sthConfig.SHOULD_HASH = ORIGINAL_SHOULD_HASH;
  });
}

/**
 * Composes and returns the params used for data retrieval
 * @param  {object} collection  The collection where data will be stored
 * @param  {string} aggregation The aggregation type
 */
function getDataRetrievalParams(collection, aggregation) {
  var dataRetrievalParams = _.cloneDeep(RETRIEVAL_DATA_PARAMS);
  dataRetrievalParams.collection = collection;
  dataRetrievalParams.attrName += aggregation;
  return dataRetrievalParams;
}

/**
 * Retrieval test
 * @param  {object}   params       Parameter object including the following properties:
 *                                   - {string} aggregation The aggregation type
 *                                   - {string} dataType    The data type
 * @param  {object}   options      Option object including the following properties:
 * @param  {number}   count        The number of stored data entries
 * @param  {Function} done         The done() function
 */
function retrievalTest(params, options, count, done) {
  sthDatabase.getCollection(
    (params.aggregation === sthConfig.AGGREGATIONS.NUMERIC ?
      NUMERIC_COLLECTION_NAME_PARAMS :
      TEXTUAL_COLLECTION_NAME_PARAMS),
    {
      shouldCreate: true,
      isAggregated: params.dataType === sthTestConfig.DATA_TYPES.AGGREGATED,
      shouldStoreHash: sthConfig.SHOULD_HASH,
      shouldTruncate: false
    },
    function(err, collection) {
      if (err) {
        return done(err);
      }
      var retrievalDataParams = getDataRetrievalParams(collection, params.aggregation);
      if (params.dataType === sthTestConfig.DATA_TYPES.RAW) {
        if (options) {
          retrievalDataParams.lastN = options.lastN;
          retrievalDataParams.hLimit = options.hLimit;
          retrievalDataParams.hOffset = options.hOffset;
          retrievalDataParams.from = options.dateFrom;
          retrievalDataParams.to = options.dateTo;
          retrievalDataParams.filetype = options.filetype;
          params.limit = options.lastN || options.hLimit;
        }
        sthDatabase.getRawData(
          retrievalDataParams,
          function(err, results) {
            if (err) {
              return done(err);
            }
            expectResult(params, count, results, done);
          }
        );
      } else {
        if (options) {
          retrievalDataParams.aggregatedFunction = options.aggrMethod;
          retrievalDataParams.resolution = options.aggrPeriod;
          retrievalDataParams.from = options.dateFrom;
          retrievalDataParams.to = options.dateTo;
          params.aggregatedFunction = options.aggrMethod;
          params.resolution = options.aggrPeriod;
        }
        sthDatabase.getAggregatedData(
          retrievalDataParams,
          function(err, results) {
            if (err) {
              return done(err);
            }
            expectResult(params, count, results, done);
          }
        );
      }
    }
  );
}

/**
 * The set of should retrieve tests
 * @param  {number} count       The number of stored data entries
 * @param  {string} aggregation The aggregation type
 * @param  {string} dataType    The data type
 */
function shouldRetrieveTests(count, aggregation, dataType) {
  if (dataType === sthTestConfig.DATA_TYPES.RAW) {
    it('should retrieve ' + count + ' ' + aggregation + ' ' +
      dataType + ' data with no params if ' + count + ' data is inserted',
      retrievalTest.bind(
        null,
        {
          aggregation: aggregation,
          dataType: dataType
        },
        null,
        count
      )
    );

    it('should retrieve ' + count + ' ' + aggregation + ' ' +
      dataType + ' data with lastN if ' + count + ' data is inserted',
      retrievalTest.bind(
        null,
        {
          aggregation: aggregation,
          dataType: dataType
        },
        {
          lastN: LIMIT
        },
        count
      )
    );

    it('should retrieve ' + count + ' ' + aggregation + ' ' +
      dataType + ' data with hLimit and hOffset if ' + count + ' data is inserted',
      retrievalTest.bind(
        null,
        {
          aggregation: aggregation,
          dataType: dataType
        },
        {
          hLimit: LIMIT,
          hOffset: PAGINATION
        },
        count
      )
    );

    it('should retrieve ' + count + ' ' + aggregation + ' ' +
      dataType + ' data with dateFrom if ' + count + ' data is inserted',
      retrievalTest.bind(
        null,
        {
          aggregation: aggregation,
          dataType: dataType
        },
        {
          dateFrom: DATE
        },
        count
      )
    );

    it('should retrieve ' + 0 + ' ' + aggregation + ' ' +
      dataType + ' data with dateFrom is beyond if ' + count + ' data is inserted',
      retrievalTest.bind(
        null,
        {
          aggregation: aggregation,
          dataType: dataType
        },
        {
          dateFrom: new Date(DATE.getTime() + (1000 * 60 * 60))
        },
        0
      )
    );

    it('should retrieve ' + count + ' ' + aggregation + ' ' +
      dataType + ' data with dateTo if ' + count + ' data is inserted',
      retrievalTest.bind(
        null,
        {
          aggregation: aggregation,
          dataType: dataType
        },
        {
          dateTo: new Date()
        },
        count
      )
    );

    it('should retrieve ' + 0 + ' ' + aggregation + ' ' +
      dataType + ' data with dateTo if previous if ' + count + ' data is inserted',
      retrievalTest.bind(
        null,
        {
          aggregation: aggregation,
          dataType: dataType
        },
        {
          dateTo: new Date(DATE.getTime() - (1000 * 60 * 60))
        },
        0
      )
    );

    it('should retrieve ' + count + ' ' + aggregation + ' ' +
      dataType + ' data with csv if ' + count + ' data is inserted',
      retrievalTest.bind(
        null,
        {
          aggregation: aggregation,
          dataType: dataType
        },
        {
          filetype: 'csv'
        },
        count
      )
    );
  } else {
    sthConfig.AGGREGATION_BY.forEach(function(aggregationBy) {
      if (aggregation === sthConfig.AGGREGATIONS.NUMERIC) {
        it('should retrieve ' + count + ' ' + aggregation + ' ' +
          dataType + ' data for a resolution of ' + aggregationBy +
          ' and an aggregation method of sum if ' + count + ' data is inserted',
          retrievalTest.bind(
            null,
            {
              aggregation: aggregation,
              dataType: dataType
            },
            {
              aggrMethod: 'sum',
              aggrPeriod: aggregationBy
            },
            count
          )
        );

        it('should retrieve ' + count + ' ' + aggregation + ' ' +
          dataType + ' data for a resolution of ' + aggregationBy +
          ' and an aggregation method of sum with dataFrom set if ' + count + ' data is inserted',
          retrievalTest.bind(
            null,
            {
              aggregation: aggregation,
              dataType: dataType
            },
            {
              aggrMethod: 'sum',
              aggrPeriod: aggregationBy,
              dateFrom: DATE
            },
            count
          )
        );

        it('should retrieve ' + count + ' ' + aggregation + ' ' +
          dataType + ' data for a resolution of ' + aggregationBy +
          ' and an aggregation method of sum with dataTo set if ' + count + ' data is inserted',
          retrievalTest.bind(
            null,
            {
              aggregation: aggregation,
              dataType: dataType
            },
            {
              aggrMethod: 'sum',
              aggrPeriod: aggregationBy,
              dateTo: new Date()
            },
            count
          )
        );

        it('should retrieve ' + count + ' ' + aggregation + ' ' +
          dataType + ' data for a resolution of ' + aggregationBy +
          ' and an aggregation method of sum2 if ' + count + ' data is inserted',
          retrievalTest.bind(
            null,
            {
              aggregation: aggregation,
              dataType: dataType
            },
            {
              aggrMethod: 'sum2',
              aggrPeriod: aggregationBy
            },
            count
          )
        );

        it('should retrieve ' + count + ' ' + aggregation + ' ' +
          dataType + ' data for a resolution of ' + aggregationBy +
          ' and an aggregation method of min if ' + count + ' data is inserted',
          retrievalTest.bind(
            null,
            {
              aggregation: aggregation,
              dataType: dataType
            },
            {
              aggrMethod: 'min',
              aggrPeriod: aggregationBy
            },
            count
          )
        );

        it('should retrieve ' + count + ' ' + aggregation + ' ' +
          dataType + ' data for a resolution of ' + aggregationBy +
          ' and an aggregation method of max if ' + count + ' data is inserted',
          retrievalTest.bind(
            null,
            {
              aggregation: aggregation,
              dataType: dataType
            },
            {
              aggrMethod: 'max',
              aggrPeriod: aggregationBy
            },
            count
          )
        );
      } else {
        it('should retrieve ' + count + ' ' + aggregation + ' ' +
          dataType + ' data for a resolution of ' + aggregationBy +
          ' and an aggregation method of occur if ' + count + ' data is inserted',
          retrievalTest.bind(
            null,
            {
              aggregation: aggregation,
              dataType: dataType
            },
            {
              aggrMethod: 'occur',
              aggrPeriod: aggregationBy
            },
            count
          )
        );
      }
    });
  }
}

/**
 * Battery of tests to check that the retrieval of raw and aggregated data works as expected
 * @param  {boolean} shouldHash Flag indicating if hashing should be used in the collection names
 */
function retrievalTests(shouldHash) {
  var ORIGINAL_DATA_MODEL,
      ORIGINAL_SHOULD_HASH,
      dataTypes = Object.keys(sthTestConfig.DATA_TYPES),
      dataModels = Object.keys(sthConfig.DATA_MODELS),
      aggregations = Object.keys(sthConfig.AGGREGATIONS);

  before(function() {
    ORIGINAL_DATA_MODEL = sthConfig.DATA_MODEL;
    ORIGINAL_SHOULD_HASH = sthConfig.SHOULD_HASH;
    sthConfig.SHOULD_HASH = shouldHash;
  });

  cleanDatabaseTests(shouldHash);

  dataModels.forEach(function(dataModel) {
    describe(sthConfig.DATA_MODELS[dataModel] + ' data model', function() {
      before(function() {
        sthConfig.DATA_MODEL = sthConfig.DATA_MODELS[dataModel];
      });

      aggregations.forEach(function(aggregation) {
        describe(sthConfig.AGGREGATIONS[aggregation], function() {
          dataTypes.forEach(function(dataType) {
            describe(sthTestConfig.DATA_TYPES[dataType] + ' data', function() {
              shouldRetrieveTests(0, sthConfig.AGGREGATIONS[aggregation], sthTestConfig.DATA_TYPES[dataType]);

              for (var i = 1; i <= 5; i++) {
                it('should store ' + (i === 1 ? i : 'another (' + i + ')') + ' ' + sthConfig.AGGREGATIONS[aggregation] +
                  ' ' + sthTestConfig.DATA_TYPES[dataType] + ' data with ' + (i - 1) * DELAY + 'ms delay',
                  shouldStoreTest.bind(null, sthConfig.AGGREGATIONS[aggregation],
                    sthTestConfig.DATA_TYPES[dataType], i)
                );

                shouldRetrieveTests(i, sthConfig.AGGREGATIONS[aggregation], sthTestConfig.DATA_TYPES[dataType]);
              }
            });
          });
        });
      });

      after(function() {
        sthConfig.DATA_MODEL = ORIGINAL_DATA_MODEL;
      });
    });
  });

  after(function() {
    sthConfig.SHOULD_HASH = ORIGINAL_SHOULD_HASH;
  });
}

describe('sth_database tests', function() {
  this.timeout(3000);
  describe('database connection', function() {
    it('should connect to the database', function(done) {
      sthDatabase.connect(DATABASE_CONNECTION_PARAMS, function(err, connection) {
        expect(err).to.be(null);
        expect(connection).to.equal(sthDatabase.connection);
        done();
      });
    });

    it('should disconnect from the database', function(done) {
      sthDatabase.closeConnection(function(err) {
        expect(err).to.be(null);
        expect(sthDatabase.connection).to.be(null);
        done();
      });
    });

    it('should notify as error the aim to connect to the database at an unavailable host', function(done) {
      var INVALID_DATABASE_CONNECTION_PARAMS = _.clone(DATABASE_CONNECTION_PARAMS);
      INVALID_DATABASE_CONNECTION_PARAMS.dbURI = 'unavailable_localhost:27017';
      sthDatabase.connect(INVALID_DATABASE_CONNECTION_PARAMS, function(err, connection) {
        expect(err).to.exist;
        expect(err.name).to.equal('MongoError');
        expect(err.message.indexOf('failed to connect to server [' + INVALID_DATABASE_CONNECTION_PARAMS.dbURI + ']')).
          to.equal(0);
        expect(connection).to.equal(null);
        done();
      });
    });

    it('should notify as error the aim to connect to the database at an unavailable port', function(done) {
      var INVALID_DATABASE_CONNECTION_PARAMS = _.clone(DATABASE_CONNECTION_PARAMS);
      INVALID_DATABASE_CONNECTION_PARAMS.dbURI = 'localhost:12345';
      sthDatabase.connect(INVALID_DATABASE_CONNECTION_PARAMS, function(err, connection) {
        expect(err).to.exist;
        expect(err.name).to.equal('MongoError');
        expect(err.message.indexOf('failed to connect to server [' + INVALID_DATABASE_CONNECTION_PARAMS.dbURI + ']')).
          to.equal(0);
        expect(connection).to.equal(null);
        done();
      });
    });
  });

  describe('helper functions', function() {
    it('should return the database name for a service', function() {
      expect(sthDatabase.getDatabaseName(sthConfig.DEFAULT_SERVICE)).to.equal(
        sthConfig.DB_PREFIX + sthConfig.DEFAULT_SERVICE);
    });

    describe('collection names', function() {
      describe('hashing enabled', collectionNameTests.bind(null, true));

      describe('hashing disabled', collectionNameTests.bind(null, false));
    });

    describe('collection access', function() {
      before(function(done) {
        connectToDatabase(done);
      });

      describe('hashing enabled', collectionAccessTests.bind(null, true));

      describe('hashing disabled', collectionAccessTests.bind(null, false));
    });
  });

  describe('storage and retrieval', function() {
    before(function(done) {
      connectToDatabase(done);
    });

    describe('storage', function() {
      describe('hashing enabled', storageTests.bind(null, true));

      describe('hashing disabled', storageTests.bind(null, false));
    });

    describe('retrieval', function() {
      before(function(done) {
        connectToDatabase(done);
      });

      describe('hashing enabled', retrievalTests.bind(null, true));

      describe('hashing disabled', retrievalTests.bind(null, false));
    });

    describe('final clean up', function() {
      describe('hashing enabled', cleanDatabaseTests.bind(null, true));

      describe('hashing disabled', cleanDatabaseTests.bind(null, false));
    });
  });
});



/*
describe('database operation', function () {
  it('should establish a connection to the database', function (done) {
    sthDatabase.connect(
      {
        authentication: sthConfig.DB_AUTHENTICATION,
        dbURI: sthConfig.DB_URI,
        replicaSet: sthConfig.REPLICA_SET,
        database: sthDatabase.getDatabaseName(sthConfig.DEFAULT_SERVICE),
        poolSize: sthConfig.POOL_SIZE
      },
      function (err) {
        done(err);
      }
    );
  });

  it('should drop the event raw data collection if it exists',
    sthTestHelper.dropRawEventCollectionTest);

  it('should drop the aggregated data collection if it exists',
    sthTestHelper.dropAggregatedDataCollectionTest);

  it('should check if the collection for the aggregated data exists', function (done) {
    sthDatabase.getCollection(
      {
        service: sthConfig.DEFAULT_SERVICE,
        servicePath: sthConfig.DEFAULT_SERVICE_PATH,
        entityId: sthTestConfig.ENTITY_ID,
        entityType: sthTestConfig.ENTITY_TYPE,
        attrName: sthTestConfig.ATTRIBUTE_NAME
      },
      {
        isAggregated: true,
        shouldCreate: false,
        shouldStoreHash: false,
        shouldTruncate: false
      },
      function (err, collection) {
        if (err && !collection) {
          // The collection does not exist
          done();
        }
      }
    );
  });

  it('should create the collection for the single events', function (done) {
    sthDatabase.connection.createCollection(collectionName4Events, function (err) {
      done(err);
    });
  });

  it('should create the collection for the aggregated data', function (done) {
    sthDatabase.connection.createCollection(collectionName4Aggregated, function (err) {
      done(err);
    });
  });

  describe('should store individual raw events and aggregated data', function () {
    for (var i = 0; i < sthTestConfig.SAMPLES; i++) {
      describe('for each new event', sthTestHelper.eachEventTestSuite);
    }
  });

  describe('should clean the data if requested', sthTestHelper.cleanDatabaseSuite);
});
*/
