'use strict';

console.log('Loading function');

const aws = require('aws-sdk');
const s3 = new aws.S3({ apiVersion: '2006-03-01' });
const headerParam=['description','quantity','measure'];

exports.handler = (event, context, callback) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));

    try{
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
            var fileData=data.Body.toString();
            //console.log(fileData);
            var fileDataAray=fileData.split("\n");
            var resultJson=convertToJSON(fileDataAray);
            var tem={resultJson};
            resultJson=JSON.stringify(tem);
            var fileName=key.substring(key.indexOf("wrkflow_step1/")+14);
            var outputLocation=fileName.substring(0,fileName.indexOf("."))+".json";
            outputLocation="wrkflow_step2/"+outputLocation;
            var outputParams = {Bucket: bucket, Key: outputLocation, Body: resultJson};
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

function convertToJSON(array) {
  try{    
  var first = array[0];
  //console.log(first);
  var jsonData = [];
  if(validateHeaders(first) && array[1]!='undefined')
  {
  var headers = first.split(',');
  
  for ( var i = 1, length = array.length; i < length; i++ )
  {
      var myRow = array[i];
     if(myRow)
     {
        var row = myRow.split(",");
        var data = {};
        for ( var x = 0; x <row.length; x++ )
        {
          var co=row[x].trim();
          data[headers[x].trim()] = co;
        }
        jsonData.push(data);
    }
 }
  //console.log(jsonData);
  
  }
  } catch (ex) {
    console.log("Error occured while converting csv to json:"+ex);    
  }
  return jsonData;  
}

function validateHeaders(first)
{
    var flag=true;
    try{
	var headers = first.split(',');
	//console.log(headers);
	for (var i=0;i<headerParam.length;i++)
	{
		if((first.toString()).indexOf(headerParam[i])==-1)
		{
			flag=false;
			break;
		}
	}
    } catch (ex) {
    console.log("Error occured while validating csv header column:"+ex);    
  }
	return flag;
}