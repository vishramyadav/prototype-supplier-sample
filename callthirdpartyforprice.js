'use strict';

console.log('Loading function');
const http = require('http');
const aws = require('aws-sdk');

const s3 = new aws.S3({ apiVersion: '2006-03-01' });
var date=new Date();
var options = {
  hostname: 'api.apotiguar.com.br',
  port: 64462,
  path: '/',
  method: 'POST',
  headers: {
      'authorization': 'AWS4-HMAC-SHA256 Credential=/20170807/us-east-1/execute-api/aws4_request,SignedHeaders=content-type;host;x-amz-date, Signature=0552d73111e76ef923d9379c98dfdbdca45e5231c1ea9b74843fe916cc3d3ff7',
      'Content-Type': 'application/json',
      'cache-control': 'no-cache',
      'host': 'api.apotiguar.com.br:64462',
      'postman-token': '4b9752f2-f34e-a8c9-2111-922464f7d946',
      'x-amz-date': date.toISOString()
  }
};

exports.handler = (event, context, callback) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));
    try {
    // Get the object from the event and show its content type
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    const params = {
        Bucket: bucket,
        Key: key,
    };
    s3.getObject(params, (err, data) => {
        if (err) {
            console.log(err);
            const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
            console.log(message);
            callback(message);
        } else {
            console.log('CONTENT TYPE:', data.ContentType);
            var jsonStrData=data.Body.toString();
            var jsonData=JSON.parse(jsonStrData);
           // console.log(jsonData);
            var code="";
            var i=0;
            var searchCodes=[];
            var arrLength=jsonData['searchCodes'].length;
            
            //console.log(jsonData['searchCodes'][i]);
            code=jsonData['searchCodes'];
            //console.log(code);
            callESDomainService(code,searchCodes,jsonData,arrLength,bucket,key);
            
            callback(null, data.ContentType);
        }
    });
    } catch (ex) {
    console.log("Error occured while reading file from S3:"+ex);    
    callback(ex);
  }
};

function callESDomainService(code,searchCodes,jsonData,arrLength,bucket,key)
{
    try {
    //console.log(code);
    //var resPrice={};
    var reqBody={"app_id": "e03ad982449af87ade1899ffbc259eee","token": "47320fd4d355f668a37a5895c15f509720a33a355a8fcac0f18c6f68da243b27","mode": "bnp_mdlog_get_list","produtos": code};
    var req = http.request(options, function(res) {
      console.log('Status: ' + res.statusCode);
      console.log('Headers: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      res.on('data', function (body) {
        //console.log('Body: ' + body);
        var pData=JSON.parse(body);
        for(var j=0;j<jsonData['jsonResult'].length;j++)
        {
            for(var i=0;i<pData['data'].length;i++)
            {
                
                var p=pData['data'][i]['data'][0]['PRECO1'];
                var c=pData['data'][i]['data'][0]['PRODUTO'];
                
                if(parseInt(jsonData['jsonResult'][j]['code']) ===c)
                {
                    jsonData['jsonResult'][j]['price']=p;
                    var q=jsonData['jsonResult'][j]['quantity'];
                    var t=parseInt(q)*p;
                    jsonData['jsonResult'][j]['total']=t;
                }
            }
        }

       createFile(jsonData,bucket,key)
      });
    });
    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });
    req.write(JSON.stringify(reqBody));
    req.end(); 
    } catch (ex) {
    console.log("Error occured while reading file from S3:"+ex);    
   }
}

function createFile(jsonData,bucket,key)
{
    console.log('creating files');
    try{
    //console.log(jsonData);
    jsonData=JSON.stringify(jsonData);
   // console.log(searchCodes);
    var fileName=key.substring(key.indexOf("wrkflow_step3/")+14);

    var outputFileLocation=fileName.substring(0,fileName.indexOf("."))+".json";
    outputFileLocation="wrkflow_step4/"+outputFileLocation;
    
    var outputParams = {Bucket: bucket, Key: outputFileLocation, Body: jsonData};
     s3.putObject(outputParams, function(err, outputdata) {
                if (err) {
                        console.log("Error uploading data: ", err);
                } else {
                        console.log("file saved!");
                }
        });
    } catch (ex) {
    console.log("Error occured while creating file :"+ex);    
   }
}
