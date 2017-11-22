'use strict';

console.log('Loading function');

const aws = require('aws-sdk');
const https = require('https');
const s3 = new aws.S3({ apiVersion: '2006-03-01' });

exports.handler = (event, context, callback) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));
   try{
    var tempJson={jsonResult:[],searchCodes:[]};

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
            var desc="";
            var i=0;
            var quant="";
            var arrLength=jsonData['resultJson'].length;
            for(i=0;i<jsonData['resultJson'].length;i++)
            {
                desc=jsonData['resultJson'][i]['description'];
                quant=jsonData['resultJson'][i]['quantity'];
                desc = desc.replace(/\s/g, '*');
                callESDomainService(desc,quant,tempJson,i,arrLength,bucket,key);
            }
            callback(null, data.ContentType);
        }
        console.log("All Done");
    });
   } catch (ex) {
    console.log("Error occured while reading file from S3:"+ex);    
    callback(ex);
  }
};

function callESDomainService(desc,quant,tempJson,count,arrLength,bucket,key)
{
    try{
    var d="",m="",s="",c="",b="";
    https.get('https://search-buildnprice-supplier-sample-liyot4gwziyvouk7n5kagjehg4.us-east-1.es.amazonaws.com/supplier/products/_search?q="'+desc+'"', (resp) => {
             var resData = '';
             resp.on('data', (chunk) => {
             resData += chunk;
             });

             resp.on('end', () => {
             console.log(resData);
             resData=JSON.parse(resData);
             if(resData['hits']['hits'])
             {
            
             for(var j=0;j<resData['hits']['hits'].length;j++)
                
                var sData=resData['hits']['hits'][j]['_source'];
                d=sData['description'];
                m=sData['measure'];
                s=sData['supplier'];
                c=sData['code'];
                b=sData['barcode'];
                tempJson['jsonResult'].push({"description":d,"measure":m,"quantity":quant,"supplier":s,"code":c,"barcode":b,"price":"0","total":"0"});
                tempJson['searchCodes'].push(c);
             } 
            
			if( tempJson['searchCodes'].length == arrLength)
                createFile(tempJson,bucket,key);
             });
            
            
            }).on("error", (err) => {
             console.log("Error: " + err.message);
            });
            
    } catch (ex) {
    console.log("Error occured while reading data from elasticsearch domain:"+ex);    
  }
}

function createFile(tempJson,bucket,key)
{
    try{
    console.log('creating files');
    tempJson=JSON.stringify(tempJson);
    var fileName=key.substring(key.indexOf("wrkflow_step2/")+14);
    var outputFileLocation=fileName.substring(0,fileName.indexOf("."))+".json";
    outputFileLocation="wrkflow_step3/"+outputFileLocation;
    
    var outputParams = {Bucket: bucket, Key: outputFileLocation, Body: tempJson};
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
