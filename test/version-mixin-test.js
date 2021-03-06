/**
 *
 * 2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

// Author : Atul
var oecloud = require('oe-cloud');
var loopback = require('loopback');
var bootstrap = require('./bootstrap');
/*var oecloud = require('oe-cloud');
var loopback = require('loopback');

oecloud.observe('loaded', function (ctx, next) {
  oecloud.attachMixinsToBaseEntity("VersionMixin");
  return next();
})


oecloud.boot(__dirname, function (err) {
  if (err) {
    console.log(err);
    process.exit(1);
  }
  oecloud.start();
  oecloud.emit('test-start');
});
*/

var chalk = require('chalk');
var chai = require('chai');
var async = require('async');
chai.use(require('chai-things'));

var expect = chai.expect;

var app = oecloud;
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var Customer;
var api = defaults(supertest(app));
var basePath = app.get('restApiRoot');
var url = basePath + '/Employees';

var models = oecloud.models;

function deleteAllUsers(done) {
  var userModel = loopback.findModel("User");
  userModel.destroyAll({}, {}, function (err) {
    if (err) {
      return done(err);
    }
    userModel.find({}, {}, function (err2, r2) {
      if (err2) {
        return done(err2);
      }
      if (r2 && r2.length > 0) {
        return done(new Error("Error : users were not deleted"));
      }
      return done();
    });
  });
}

var globalCtx = {
  ignoreAutoScope: true,
  ctx: { tenantId: '/default' }
};

describe(chalk.blue('Version Mixin Test Started'), function (done) {
  this.timeout(10000);
  before('wait for boot scripts to complete', function (done) {
    //app.on('test-start', function () {
    Customer = loopback.findModel("Customer");
    deleteAllUsers(function () {
      return done();
    });
    //});
  });

  afterEach('destroy context', function (done) {
    done();
  });

  it('t1-0 create user admin/admin with /default tenant', function (done) {
    var url = basePath + '/users';
    api.set('Accept', 'application/json')
      .post(url)
      .send([{ username: "admin", password: "admin", email: "admin@admin.com" },
      { username: "evuser", password: "evuser", email: "evuser@evuser.com" },
      { username: "infyuser", password: "infyuser", email: "infyuser@infyuser.com" },
      { username: "bpouser", password: "bpouser", email: "bpouser@bpouser.com" }
      ])
      .end(function (err, response) {

        var result = response.body;
        expect(result[0].id).to.be.defined;
        expect(result[1].id).to.be.defined;
        expect(result[2].id).to.be.defined;
        expect(result[3].id).to.be.defined;
        done();
      });
  });

  var adminToken;
  it('t2 Login with admin credentials', function (done) {
    var url = basePath + '/users/login';
    api.set('Accept', 'application/json')
      .post(url)
      .send({ username: "admin", password: "admin" })
      .end(function (err, response) {
        var result = response.body;
        adminToken = result.id;
        expect(adminToken).to.be.defined;
        done();
      });
  });

  it('t3-1 clean up Customer models', function (done) {
    Customer.destroyAll({}, { notify: false }, function (err) {
      return done(err);
    });
  });

  it('t3-2 create records in Customer models', function (done) {
    Customer.create([{ name: "Smith", age: 30, id: 1 }, { name: "Atul", age: 30, id: 2 }, { name: "John", age: 30, id: 3 }], globalCtx, function (err, r) {
      if (err) {
        return done(err);
      }
      expect(r.length).to.be.equal(3);
      expect(r[0]._version).not.to.be.undefined;
      return done();
    });
  });


  it('t4-1 fetch record and update without providing version and providing wrong version - it should fail', function (done) {
    Customer.find({}, globalCtx, function (err, r) {
      if (err) {
        return done(err);
      }
      expect(r.length).to.be.equal(3);
      expect(r[0]._version).not.to.be.undefined;

      var instance = r[0];
      instance.updateAttributes({ name: "Changed", id: 1, age: 50 }, globalCtx, function (err, r) {
        if (!err) {
          return done(new Error("Expcted test case to throw error"));
        }
        instance.updateAttributes({ name: "Changed", id: 1, age: 50, _version: "ABCDEF" }, globalCtx, function (err, r) {
          if (err) {
            return done();
          }
          return done(new Error("Expcted test case to throw error"));
        });
      });
    });
  });

  it('t4-2 fetch record and update by providing right version - it should succeed', function (done) {
    Customer.find({}, globalCtx, function (err, r) {
      if (err) {
        return done(err);
      }
      expect(r.length).to.be.equal(3);
      expect(r[0]._version).not.to.be.undefined;

      var instance = r[0];
      instance.updateAttributes({ name: "Changed", id: 1, age: 50, _version: instance._version }, globalCtx, function (err, r) {
        if (err) {
          return done(err);
        }
        return done();
      });
    });
  });


  it('t5-1 fetch record and update without providing version - it should fail - using replacebyid', function (done) {
    Customer.find({}, globalCtx, function (err, r) {
      if (err) {
        return done(err);
      }
      expect(r.length).to.be.equal(3);
      expect(r[0]._version).not.to.be.undefined;

      var instance = r[0];
      Customer.replaceById(1, { name: "Changed Again", age: 55 }, globalCtx, function (err, r) {
        if (err) {
          return done();
        }
        return done(new Error("Error"));
      });
    });
  });

  it('t5-2 fetch record and update by providing right version - it should succeed - using replacebyid', function (done) {
    Customer.find({}, globalCtx, function (err, r) {
      if (err) {
        return done(err);
      }
      expect(r.length).to.be.equal(3);
      expect(r[0]._version).not.to.be.undefined;
      var instance = r[0];
      Customer.replaceById(1, { name: "Changed Again", age: 55, _version: instance._version }, globalCtx, function (err, r) {
        if (err) {
          return done(err);
        }
        return done();
      });
    });
  });

  it('t6-1 fetch record and update without providing version or passing wrong version - it should fail - using HTTP REST', function (done) {

    var url = basePath + '/customers?access_token=' + adminToken;
    api.set('Accept', 'application/json')
      .get(url)
      .end(function (err, response) {
        var result = response.body;
        expect(response.status).to.be.equal(200);
        expect(result.length).to.be.equal(3);
        var instance = result[0];

        api.set('Accept', 'application/json')
          .put(url)
          .send({ name: "Customer AA", age: 100, id: 1 })
          .end(function (err, response) {
            var result = response.body;
            expect(response.status).not.to.be.equal(200);

            api.set('Accept', 'application/json')
              .put(url)
              .send({ name: "Customer AA", age: 100, id: 1, _version: "ABCDDD" })
              .end(function (err, response) {
                var result = response.body;
                expect(response.status).not.to.be.equal(200);
                done();
              });
          });
      });
  });


  it('t6-2 fetch record and update by providing right version - it should succeed - using HTTP REST', function (done) {

    var url = basePath + '/customers?access_token=' + adminToken;
    api.set('Accept', 'application/json')
      .get(url)
      .end(function (err, response) {
        var result = response.body;
        expect(response.status).to.be.equal(200);
        expect(result.length).to.be.equal(3);
        var instance = result[0];
        api.set('Accept', 'application/json')
          .put(url)
          .send({ name: "Customer BB", age: 100, id: 1, _version: instance._version })
          .end(function (err, response) {
            var result = response.body;
            expect(response.status).to.be.equal(200);
            return done(err);
          });
      });
  });

  it('t6-3 fetch record and ensure that update was right - using HTTP REST', function (done) {

    var url = basePath + '/customers?access_token=' + adminToken;
    api.set('Accept', 'application/json')
      .get(url)
      .end(function (err, response) {
        var result = response.body;
        expect(response.status).to.be.equal(200);
        expect(result.length).to.be.equal(3);
        expect(result.find(function (item) { return (item.name === "Customer BB" && item.age === 100); }).name).to.be.equal("Customer BB");
        return done();
      });
  });


  it('t7-1 New test', function (done) {
    Customer.find({}, globalCtx, function (err, r) {
      if (err) {
        return done(err);
      }
      expect(r.length).to.be.equal(3);
      expect(r[1]._version).not.to.be.undefined;

      var instance = r[1];
      instance.updateAttributes({name : "Atul", age : 44, id : instance.id}, globalCtx, function(err, r){
        return done();
      });
    });
  });  

  it('t7-1 deleting record without providing version or providing wrong version - it should fail - using HTTP REST', function (done) {

    var url = basePath + '/customers?access_token=' + adminToken;
    api.set('Accept', 'application/json')
      .get(url)
      .end(function (err, response) {
        var result = response.body;
        expect(response.status).to.be.equal(200);
        expect(result.length).to.be.equal(3);
        var instance = result[0];
        var url2 = basePath + '/customers/' + instance.id + '?access_token=' + adminToken;
        api.set('Accept', 'application/json')
          .delete(url2)
          .send({})
          .end(function (err, response) {
            var result = response.body;
            expect(response.status).not.to.be.equal(200);
            var url2 = basePath + '/customers/' + instance.id + '/xyz?access_token=' + adminToken;
            api.set('Accept', 'application/json')
              .delete(url2)
              .send({})
              .end(function (err, response) {
                var result = response.body;
                expect(response.status).not.to.be.equal(200);
                done();
              });
          });
      });
  });

  it('t7-2 deleting record by providing right version - it should succeed - using HTTP REST', function (done) {
    var url = basePath + '/customers?access_token=' + adminToken;
    api.set('Accept', 'application/json')
      .get(url)
      .end(function (err, response) {
        var result = response.body;
        expect(response.status).to.be.equal(200);
        expect(result.length).to.be.equal(3);
        var instance = result[0];
        var url2 = basePath + '/customers/' + instance.id + '/' + instance._version + '?access_token=' + adminToken;
        api.set('Accept', 'application/json')
          .delete(url2)
          .send({})
          .end(function (err, response) {
            var result = response.body;
            expect(response.status).to.be.equal(200);
            expect(response.body.count).to.be.equal(1);
            return done(err);
          });
      });
  });


  var model;
  var modelName = 'VersionMixinTest';
  var modelDetails = {
    name: modelName,
    base: 'BaseEntity',
    properties: {
      'name': {
        'type': 'string',
      }
    },
    plural: modelName
  };

  it('t8-1 (oe 1.x test cases) should create a new record with version number', function (done) {
    models.ModelDefinition.create(modelDetails, globalCtx, function (err, res) {
      if (err) {
        console.log('unable to create VersionMixinTest model');
        done(err);
      } else {
        model = loopback.getModel(modelName, globalCtx);
        done();
      }
    });
  });


  it('t8-2 (oe 1.x test cases) should create a new record with version number', function (done) {
    var postData = {
      'name': 'record1'
    };
    model.create(postData, globalCtx, function (err, res) {
      if (err) {
        done(err);
      } else {
        expect(res._version).not.to.be.empty;
        done();
      }
    });
  });


  it('t8-3 (oe 1.x test cases) should create and update a record  -upsert', function (done) {
    var postData = {
      'name': 'record2'
    };
    model.create(postData, globalCtx, function (err, res) {
      if (err) {
        done(err);
      } else {
        res.name = 'updatedRecord2';
        model.upsert(res, globalCtx, function (err, res1) {
          if (err) {
            done(err);
          } else {
            expect(res1._version).not.to.be.empty;
            expect(res1.name).to.be.equal('updatedRecord2');
            done();
          }
        });
      }
    });
  });


  it('t8-4 (oe 1.x test cases) should not update a record with wrong version  -upsert', function (done) {
    // commented out as upsert and autoscope is resulting into new record
    // I think upsert should not allow version on new record
    // Or upsert should never insert if version is present
    // and internally can do update
    var postData = {
      'name': 'record3'
    };
    model.create(postData, globalCtx, function (err, res) {
      if (err) {
        done(err);
      } else {
        postData.name = 'updatedRecord3';
        postData._version = 'wrongNumber';
        postData.id = res.id;
        model.upsert(postData, globalCtx, function (err1, res1) {
          if (err1) {
            expect(err1.message).not.to.be.empty;
            done();
          } else {
            done(new Error('record updated with wrong version number'));
          }
        });
      }
    });
  });

  it('t8-5 (oe 1.x test cases) should not update a record without version number  -upsert', function (done) {
    var postData = {
      'name': 'record3'
    };
    model.create(postData, globalCtx, function (err, res) {
      if (err) {
        done(err);
      } else {
        postData.name = 'updatedRecord3';
        postData.id = res.id;
        postData._version = undefined;
        model.upsert(postData, globalCtx, function (err1, res1) {
          if (err1) {
            expect(err1.message).not.to.be.empty;
            done();
          } else {
            done(new Error('record updated without version number'));
          }
        });
      }
    });
  });

  it('t8-6 (oe 1.x test cases) should create and update a record  -updateAttributes', function (done) {
    var postData = {
      'name': 'record4'
    };
    model.create(postData, globalCtx, function (err, res) {
      if (err) {
        done(err);
      } else {
        model.findOne({
          where: {
            id: res.id
          }
        }, globalCtx, function (err1, instance) {
          if (err1 || !instance) {
            done(err1 || new Error('record not found'));
          } else {
            postData.name = 'updatedRecord4';
            postData._version = instance._version;
            instance.updateAttributes(postData, globalCtx, function (err2, res1) {
              if (err2) {
                done(err2);
              } else {
                expect(res1._version).not.to.be.empty;
                expect(res1.name).to.be.equal('updatedRecord4');
                done();
              }
            });
          }
        });
      }
    });
  });

  it('t8-7 (oe 1.x test cases) should not update a record with wrong version -updateAttributes', function (done) {
    var postData = {
      'name': 'record5'
    };
    model.create(postData, globalCtx, function (err, res) {
      if (err) {
        done(err);
      } else {
        model.findOne({
          where: {
            id: res.id
          }
        }, globalCtx, function (err1, instance) {
          if (err1 || !instance) {
            done(err1 || new Error('record not found'));
          } else {
            postData.name = 'updatedRecord5';
            postData._version = 'WrongVersion';
            postData.id = res.id;
            instance.updateAttributes(postData, globalCtx, function (err2, res1) {
              if (err2) {
                expect(err2.message).not.to.be.empty;
                done();
              } else {
                done(new Error('record updated with wrong version number'));
              }
            });
          }
        });
      }
    });
  });
  it('t8-8 (oe 1.x test cases) should update a record without version programitacally -updateAttributes', function (done) {
    var postData = {
      'name': 'record6'
    };
    model.create(postData, globalCtx, function (err, res) {
      if (err) {
        done(err);
      } else {
        model.findOne({
          where: {
            id: res.id
          }
        }, globalCtx, function (err1, instance) {
          if (err1 || !instance) {
            done(err1 || new Error('record not found'));
          } else {
            postData.name = 'updatedRecord6';
            instance.updateAttributes(postData, globalCtx, function (err2, res1) {
              if (err2) {
                return done();
              }
              done(new Error("Expected version error but got success code"));
            });
          }
        });
      }
    });
  });
  it('t8-9 (oe 1.x test cases) should create and update a record with version - upsert 1', function (done) {
    var postData = {
      'name': 'record7'
    };
    model.create(postData, globalCtx, function (err, res) {
      if (err) {
        done(err);
      } else {
        postData.name = 'updatedRecord7';
        postData._version = res._version;
        postData.id = res.id;
        model.upsert(postData, globalCtx, function (err2, res1) {
          if (err2) {
            done(err2);
          } else {
            expect(res1._version).not.to.be.empty;
            done();
          }
        });
      }
    });
  });

  it('t8-10 (oe 1.x test cases) should delete a record giving id and version number -deleteById', function (done) {
    var postData = {
      'name': 'record11'
    };
    model.create(postData, globalCtx, function (err, res) {
      if (err) {
        done(err);
      } else {
        model.deleteById(res.id, res._version, globalCtx, function (err2, res1) {
          if (err2) {
            done(new Error('record not deleted without version number'));
          } else {
            expect(res1.count).to.be.equal(1);
            done();
          }
        });
      }
    });
  });


  it('t8-11 (oe 1.x test cases) clean up : database', function (done) {
    // clearing data from VersionMixinTest model
    model.destroyAll({}, globalCtx, function (err, info) {
      if (err) {
        return done(err);
      } else {
        models.ModelDefinition.destroyAll({
          "name": modelName
        }, globalCtx, function (err) { });
        return done();
      }
    });
  });

  var async = require('async');
  var Person;
  it('t9-0 create records in Person models', function (done) {
    Person = loopback.findModel("Person");
    Person.create([{ name: "Person Smith", age: 30, id: 1 }, { name: "Person Atul", age: 30, id: 2 }, { name: "Person John", age: 30, id: 3 }], globalCtx, function (err, r) {
      if (err) {
        return done(err);
      }
      expect(r.length).to.be.equal(3);
      expect(r[0]._version).not.to.be.undefined;
      return done();
    });
  });


  it('t9 - multiple updates using updateAttributes at same time should fail for all but one', function (done) {
    var inst1, inst2, inst3, inst4;
    Person.find({ where: { id: 2 }}, globalCtx, function (err, results) {
      if (err) {
        return done(err);
      }
      inst1 = results[0];
      Person.find({ where: { id: 2 } }, globalCtx, function (err, results) {
        if (err) {
          return done(err);
        }
        inst2 = results[0];
        Person.find({ where: { id: 2 } }, globalCtx, function (err, results) {
          if (err) {
            return done(err);
          }
          inst3 = results[0];
          Person.find({ where: { id: 2 } }, globalCtx, function (err, results) {
            if (err) {
              return done(err);
            }
            inst4 = results[0];
            var ary = [inst1, inst2, inst3, inst4];
            var flags = [];
            async.eachOf(ary, function (instance, index, cb) {
              instance.updateAttributes({ name: "New Name via UpdateAttribute" + index.toString(), _version :  instance._version }, globalCtx, function (err, inst) {
                if (err) {
                  flags.push(false);
                }
                else
                  flags.push(true);

                return cb();
              });

            }, function (err) {
              var cnt = 0;
              for (var i = 0; i < flags.length; ++i) {
                if (flags[i]) {
                  ++cnt;
                }
              }
              if (cnt != 1) {
                return done(new Error("Update of More than one instance was successful which should not have happened."));
              }
              return done(err);
            });
          });
        });
      });
    });

  });

  it('t10 - multiple updates using replaceById at same time should fail for all but one', function (done) {
    var inst1, inst2, inst3, inst4;
    Person.find({ where: { id: 2 } }, globalCtx, function (err, results) {
      if (err) {
        return done(err);
      }
      inst1 = results[0];
      var version = inst1._version;

      var ary = [1, 2, 3, 4];

      var flags = [];
      async.eachOf(ary, function (instance, index, cb) {
        Person.replaceById(2, { name: "New Name via replaceById" + index.toString(), _version: version }, globalCtx, function (err, inst) {
          if (err) {
            flags.push(false);
          }
          else
            flags.push(true);

          return cb();
        });
      }, function (err) {
        var cnt = 0;
        for (var i = 0; i < flags.length; ++i) {
          if (flags[i]) {
            ++cnt;
          }
        }
        if (cnt != 1) {
          return done(new Error("Update of More than one instance was successful which should not have happened."));
        }
        return done(err);
      });
    });
  });

  it('t11 - multiple updates using upsert at same time should fail for all but one', function (done) {
    var inst1, inst2, inst3, inst4;
    Person.find({ where: { id: 2 } }, globalCtx, function (err, results) {
      if (err) {
        return done(err);
      }
      inst1 = results[0];
      var version = inst1._version;

      var ary = [1, 2, 3, 4];

      var flags = [];
      async.eachOf(ary, function (instance, index, cb) {
        Person.upsert({ id : 2, name: "New Name via upsert" + index.toString(), _version: version }, globalCtx, function (err, inst) {
          if (err) {
            flags.push(false);
          }
          else
            flags.push(true);

          return cb();
        });
      }, function (err) {
        var cnt = 0;
        for (var i = 0; i < flags.length; ++i) {
          if (flags[i]) {
            ++cnt;
          }
        }
        if (cnt != 1) {
          return done(new Error("Update of More than one instance was successful which should not have happened."));
        }
        return done(err);
      });
    });
  });

});





