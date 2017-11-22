'use strict';

console.log('Loading function');

const aws = require('aws-sdk');

const s3 = new aws.S3({ apiVersion: '2006-03-01' });
const snsClient = new aws.SNS();
var snsTopicArn = "arn:aws:sns:us-west-2:789753010953:notifynewbuildprice";
var email="queirozsc@buildnprice.io";   
exports.handler = (event, context, callback) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));
    try{
     
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
            //console.log(jsonData);
            var desc="";
            var i=0;
            var row="";
            var col="";
            var fileName=key.substring(key.indexOf("wrkflow_step4/")+14);
            console.log(fileName);
            fileName=fileName.substring(0,fileName.indexOf("."));
            var date=new Date().toISOString();
            var emailLis=getSubscriptionEmailList(fileName);
            email=emailLis[0];
            var arrLength=jsonData['jsonResult'].length;
            for(i=0;i<jsonData['jsonResult'].length;i++)
            {
                //console.log(jsonData['resultJson'][i]);description
                desc=jsonData['jsonResult'][i]['description'];
               row=row+fileName+","+email+","+date+","+desc+","+jsonData['jsonResult'][i]['quantity']+","+
               jsonData['jsonResult'][i]['measure']+","+
               jsonData['jsonResult'][i]['supplier']+","+
               jsonData['jsonResult'][i]['code']+","+
               jsonData['jsonResult'][i]['barcode']+","+
               jsonData['jsonResult'][i]['price']+","+
               jsonData['jsonResult'][i]['total']+"\n";
            }
            //console.log(row);
            //var fileName=key.substring(key.indexOf("wrkflow_step4/")+14);
            var outputFileLocation=fileName+".csv";
            outputFileLocation="wrkflow_step5/"+outputFileLocation;
            
            var outputParams = {Bucket: bucket, Key: outputFileLocation, Body: row};
             s3.putObject(outputParams, function(err, outputdata) {
                        if (err) {
                                console.log("Error uploading data: ", err);
                        } else {
                                console.log("file saved!");
                        }
                });
            callback(null, data.ContentType);
        }
    });
    } catch (ex) {
    console.log("Error occured while reading file from S3:"+ex);    
    callback(ex);
  }
};

function getSubscriptionEmailList(fileName)
{
    var emailList=[];
    try
    {
        var snsTopicArn = "arn:aws:sns:us-west-2:789753010953:"+fileName;
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
                      emailList.push(t['Endpoint']);
                  }
              }
              console.log(emailList);
          }
        });
    return emailList;
    }catch(ex){
        console.log("Error occured while reading email list from SNS:"+ex);    
        
    }
}