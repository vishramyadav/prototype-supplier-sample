'use strict';

const https = require('https');
const aws = require('aws-sdk');

const s3 = new aws.S3({ apiVersion: '2006-03-01',region:'us-west-2',endpoint:'s3-us-west-2.amazonaws.com'  });
const snsClient = new aws.SNS();


console.log('Loading hello world function');
 
//var email="queirozsc@buildnprice.io"; 


exports.handler = function(event, context, callback) {
    let name = "you";
    let city = 'World';
    let time = 'day';
    let day = '';
    let responseCode = 200;
    console.log("request: " + JSON.stringify(event));
    
    var fileName='';
    
    // This is a simple illustration of app-specific logic to return the response. 
    // Although only 'event.queryStringParameters' are used here, other request data, 
    // such as 'event.headers', 'event.pathParameters', 'event.body', 'event.stageVariables', 
    // and 'event.requestContext' can be used to determine what response to return. 
    //
    if (event.queryStringParameters !== null && event.queryStringParameters !== undefined) {
        if (event.queryStringParameters.filename !== undefined && 
            event.queryStringParameters.filename !== null && 
            event.queryStringParameters.filename !== "") {
            console.log("Received filename: " + event.queryStringParameters.filename);
            fileName = event.queryStringParameters.filename;
        }
    }
    
    if (event.pathParameters !== null && event.pathParameters !== undefined) {
        if (event.pathParameters.proxy !== undefined && 
            event.pathParameters.proxy !== null && 
            event.pathParameters.proxy !== "") {
            console.log("Received proxy: " + event.pathParameters.proxy);
            city = event.pathParameters.proxy;
        }
    }
    
    if (event.headers !== null && event.headers !== undefined) {
        if (event.headers['day'] !== undefined && event.headers['day'] !== null && event.headers['day'] !== "") {
            console.log("Received day: " + event.headers.day);
            day = event.headers.day;
        }
    }
    
    if (event.body !== null && event.body !== undefined) {
        let body = JSON.parse(event.body)
        if (body.callerName) 
            name = body.callerName;
    }
    //var emailList=getSubscriptionEmailList(fileName);
    //console.log(emailList);
    //var subsemail=emailList[0];
    //console.log(subsemail);
    //var tot=100.0;
	var total=readFileFromS3(fileName);
	//callHubspotApiForContact(total,subsemail);
 
    let greeting = 'Good ' + time + ', ' + name + ' of ' + city + '. ';
    if (day) greeting += 'Happy ' + day + '!';

    var responseBody = {
        message: greeting,
        input: event
    };
    
    // The output from a Lambda proxy integration must be 
    // of the following JSON object. The 'headers' property 
    // is for custom response headers in addition to standard 
    // ones. The 'body' property  must be a JSON string. For 
    // base64-encoded payload, you must also set the 'isBase64Encoded'
    // property to 'true'.
    var response = {
        statusCode: responseCode,
        headers: {
            "x-custom-header" : "my custom header value"
        },
        body: JSON.stringify(responseBody)
    };
    console.log("response: " + JSON.stringify(response))
    callback(null, response);
};

function callHubspotApiForContact(total,subsemail)
{
    var vid='';
      console.log("inside callHubspotApiForContact");
    try {
        var options_contact = {
  hostname: 'api.hubapi.com',
  path: '/contacts/v1/contact/email/'+subsemail+'/profile?hapikey=28068393-ee4d-49d7-b16f-e0ebe61153a8',
  method: 'GET',
  headers: {
      'Content-Type': 'application/json',
      'cache-control': 'no-cache',
      'host': 'api.hubapi.com',
      'postman-token': '8fedfcc2-e35b-8b97-80b2-16826c60b1d5',
      
  }
};

    var req = https.request(options_contact, function(res) {
      console.log('Status: ' + res.statusCode);
      console.log('Headers: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      var resData='';
      res.on('data', function (body) {
          resData=resData+body;
        
      });
       res.on('end', () => {
             console.log(resData);
             resData=JSON.parse(resData);
             console.log(resData);
             console.log(resData['vid']);
            vid=resData['vid'];   
            callHubspotApiForDealId(vid,total);
            console.log("inside callHubspotApiForContact exit");
             }); 
    });
    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });
    //req.write();
    req.end(); 
    } catch (ex) {
    console.log("Error occured while calling contact api:"+ex);    
   }
   return 
}

function callHubspotApiForDealId(vid,total)
{
    console.log("inside callHubspotApiForDealId");
    try {
	var options={
		  hostname: 'api.hubapi.com',
		  path: '/deals/v1/deal/associated/contact/'+vid+'/paged?hapikey=28068393-ee4d-49d7-b16f-e0ebe61153a8',
		  method: 'GET',
		  headers: {
			  'Content-Type': 'application/json',
			  'cache-control': 'no-cache',
			  'host': 'api.hubapi.com',
			  'postman-token': 'baec65de-7ff8-ef9c-e1a3-e26efda4ffad',
			  
		  }
		
	};	
    var req = https.request(options, function(res) {
      console.log('Status: ' + res.statusCode);
      console.log('Headers: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
     var resData='';
      res.on('data', function (body) {
          resData=resData+body;
        
      });
      res.on('end', () => {
             console.log(resData);
             resData=JSON.parse(resData);
             console.log(resData);
             var dealId='';
             for(var i=0;i<resData['deals'].length;i++)
             {
                 
                 dealId=resData['deals'][i]['dealId'];
                console.log(dealId);
             }
            //vid=resData['vid'];   
            callHubspotApiUpdateTotalPrice(dealId,total);
            console.log("inside callHubspotApiForDealId exit");
             }); 
      
    });
    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });
    //req.write();
    req.end(); 
    } catch (ex) {
    console.log("Error occured while reading file from S3:"+ex);    
   }
}

function callHubspotApiUpdateTotalPrice(dealId,total)
{
    try {
        console.log("inside callHubspotApiUpdateTotalPrice");
        var reqBody={"properties": [{"name": "amount","value": ""+total}]};	
        var bData=JSON.stringify(reqBody);
	var options={
		  hostname: 'api.hubapi.com',
		  path: '/deals/v1/deal/'+dealId+'?hapikey=28068393-ee4d-49d7-b16f-e0ebe61153a8',
		  method: 'PUT',
		  headers: {
			  'Content-Type': 'application/json',
			  'cache-control': 'no-cache',
			  'host': 'api.hubapi.com',
			  'postman-token': 'f91016d7-710b-ded3-f507-5d8a3a92fafc',
			  'Content-Length':bData.length
		  }
		
	};	
 
    var req = https.request(options, function(res) {
      console.log('Status: ' + res.statusCode);
      console.log('Headers: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      var resData='';
      res.on('data', function (body) {
          resData=resData+body;
        
      });
      res.on('end', () => {
             console.log(resData);
             //resData=JSON.parse(resData);
             //console.log(resData);
          console.log("inside callHubspotApiUpdateTotalPrice exit");
      
    });
      
    });
    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });
    req.write(bData);
    req.end(); 
    } catch (ex) {
    console.log("Error occured while updating total to hubspot:"+ex);    
   }
}

function readFileFromS3(fileName)
{
    try
    {
      console.log("inside readFileFromS3");
    var tot=0.0;
    var bucket='checkinputfile-process';
    var key='wrkflow_step4/'+fileName;
    const params = {
        Bucket:bucket ,
        Key: key,
    };
    s3.getObject(params, (err, data) => {
        if (err) {
            console.log(err);
            const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
            console.log(message);
           
        } else {
            console.log('CONTENT TYPE:', data.ContentType);
            var jsonStrData=data.Body.toString();
            var jsonData=JSON.parse(jsonStrData);
            var arrLength=jsonData['jsonResult'].length;
            
            for(var i=0;i<jsonData['jsonResult'].length;i++)
            {
                tot=tot+jsonData['jsonResult'][i]['total'];
            }
            console.log(tot);
           getSubscriptionEmailList(tot,fileName);
           // callHubspotApiUpdateTotalPrice(tot);
           console.log("inside readFileFromS3 exit");
        }
       
    });
    
    return tot;
    }catch(ex)
    {
        console.log("Error occured while reading file from s3:"+ex);
    }
}

function getSubscriptionEmailList(tot,fileName)
{
    console.log("inside getSubscriptionEmailList");
    console.log(fileName);
    fileName=fileName.substring(0,fileName.indexOf("."));
    console.log(fileName);
    var snsTopicArn = "arn:aws:sns:us-west-2:789753010953:"+fileName;
    var emailList=[];
    try
    {
        
        var params = {
          TopicArn: snsTopicArn
          
        };
        snsClient.listSubscriptionsByTopic(params, function(err, data) {
          if (err) console.log(err, err.stack); // an error occurred
          else  {   
              console.log(data);           // successful response
              var tempList=data;
              var t=[];
              for(var i=0;i<tempList['Subscriptions'].length;i++)
              {
                  t=tempList['Subscriptions'][i];
                  if(t.Protocol == 'email')
                  {
                      emailList.push(t.Endpoint);
                  }
              }
              console.log(emailList);
               callHubspotApiForContact(tot,emailList);
                 console.log("inside getSubscriptionEmailList exit");
          }
        });
    return emailList;
    }catch(ex){
        console.log("Error occured while reading email list from SNS:"+ex);    
        
    }
}