/**
 * InventoryController
 *
 * @description :: Server-side logic for managing inventories
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var Promise = require('bluebird');
var searchDashboardQuery = "select p.id as upid,p.style_code,p.color,p.name,v.size,v.length,v.buying_price,v.expected_sale_price,v.units,p.description,p.level2_category,p.level3_category,p.source_shop,p.photoshoot_done,p.photoshoot_done_at,p.material from products p, variants v where p.id = v.product_id order by p.id,v.size;";

function getStocksSubQuery(params, productId) {
  var insertVariantsQuery = "";
  var stocks = params.stocks;
  for (var stock_name in stocks) {
    var stock_units = stocks[stock_name];
    if (stock_units > -1) {
      if (stock_name === "freeSize")
        stock_name = "Free Size";
      else
        stock_name = stock_name.toUpperCase();
      insertVariantsQuery += productId + ",'" + stock_name + "','" + stock_units + "','"
        + params.buyCost + "','" + params.netExpectedAmount + "','" + params.netExpectedAmount + "'),(";
    }
  }
  insertVariantsQuery = insertVariantsQuery.substring(0, insertVariantsQuery.length - 2);
  return insertVariantsQuery;
}

function executeSqlQuery(query) {
  var userQueryAsync = Promise.promisify(User.query);
  sails.log.info("Executing query : " + query);
  return userQueryAsync(query);
}

function executeVariantsSqlQuery(result2, params) {
  var productId = result2[0].id;
  var insertVariantsQuery = ""
    + "insert into variants "
    + "(product_id,size,units,buying_price,expected_sale_price,length) values (";
  var subQuery = getStocksSubQuery(params, productId);
  insertVariantsQuery += subQuery + " on duplicate key update units=values(units),buying_price=values(buying_price),expected_sale_price=values(expected_sale_price),length=values(length)";
  console.log(insertVariantsQuery);
  return executeSqlQuery(insertVariantsQuery);
}

module.exports = {
  save: function (req, res) {
    var params = req.params.all().data;
    var insertProductsQuery = ""
      + "insert into products "
      + "(`style_code`, `color`, `name`, `description`, `level1_category`, `level2_category`, `level3_category`, `care_instruction`, `photoshoot_done`,photoshoot_done_at,material) VALUES ("
      + "'" + params.styleCode + "','" + params.productColor + "','" + params.productName + "','" + params.productDescription + "','"
      + params.level1_category + "','" + params.level2_category + "','" + params.level3_category + "','" + params.care + "','"
      + params.photoshoot_status + "','" + params.photoshoot_done_at + "','" + params.material + "'"
      + ") on duplicate key update  name = values(name),description=values(description),level1_category=values(level1_category),level2_category=values(level2_category),level3_category=values(level3_category),care_instruction=values(care_instruction),photoshoot_done=values(photoshoot_done),photoshoot_done_at=values(photoshoot_done_at),material=values(material)";

    var selectProductIdQuery = ""
      + "select id from products "
      + "where style_code = '" + params.styleCode + "' and color = '" + params.productColor + "'";

    executeSqlQuery(insertProductsQuery).then(function (result1) {
      return executeSqlQuery(selectProductIdQuery).then(function (result2) {
        return executeVariantsSqlQuery(result2, params).then(function (result3) {
          console.log(JSON.stringify(result1));
          console.log(JSON.stringify(result2));
          console.log(JSON.stringify(result3));
          return console.log("Successfully saved data=" + JSON.stringify(params));
          return res.ok("ok");
        });
      });
    }).catch(function (e) {
      console.log("Error in saving data=" + JSON.stringify(params));
      console.log("Error=" + JSON.stringify(e));
      return res.serverError("error");
    });
  }
  ,

  find: function (req, res) {
    executeSqlQuery(searchDashboardQuery)
      .then(function (results) {
        return res.ok(results);
      });
  },

  // Adds new inventory if upid not given
  // Edits existing inventory if upid given
  add: function (req, res) {
    var controllerData = {};

    var upid = req.params.id;
    var populateFields = false;
    // If upid is undefined that means "add new inventory" has been called
    // So we set upid = 1 so that values are filled in locals data
    // else <%= %> fails in template as fields in controllerData do not exist
    // though fields are set in controllerData, but these are not used as populate is false
    if (typeof upid === 'undefined') {
      upid = 1;
      populateFields = false;
    } else {
      // "edit inventory" has been called and we need to pre-populate fields which can be edited
      populateFields = true;
    }
    var typeOfCall = populateFields ? 'Edit' : 'Add';

    var searchUpidQuery = "" +
      " select p.id as upid,p.style_code,p.color,p.name,v.size,v.length,v.buying_price,v.expected_sale_price,v.units,p.description,p.level2_category,p.level3_category,p.source_shop,p.photoshoot_done,p.photoshoot_done_at,p.material,p.care_instruction as care " +
      " from products p, variants v " +
      " where p.id = " + upid +
      " and v.product_id = " + upid +
      " order by p.id,v.size;";
    var stocks = {};
    stocks.S = -1;
    stocks.M = -1;
    stocks.L = -1;
    stocks.XL = -1;
    stocks.freeSize = -1;

    executeSqlQuery(searchUpidQuery)
      .then(function (results) {
        controllerData = results[0];

        for (var i = 0; i < results.length; i++) {
          var row = results[i];
          if (row['size'] === 'Free Size') {
            stocks['freeSize'] = row.units;
            controllerData.freeSizeAvailable = true;
          }
          else {
            stocks[row['size'].toUpperCase()] = row.units;
            controllerData.freeSizeAvailable = false;
          }
        }
        controllerData.stocks = stocks;
        controllerData.populate = populateFields;
        console.log("Called " + typeOfCall + " function call for upid:" + upid + " data:" + JSON.stringify(controllerData));
        res.view('addInventory', controllerData);
      }).catch(function (e) {
      console.log("Error happened for " + typeOfCall + " function call for upid:" + upid + " error:" + e);
    });
  }
}
;

