from __future__ import print_function

import json
import urllib
import boto3
import os
from botocore.exceptions import ClientError
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

print('Loading function')

s3 = boto3.client('s3')
snsclient = boto3.client('sns')
#snsTopicArn = "arn:aws:sns:us-west-2:789753010953:notifynewbuildprice"
#COMMASPACE = ', '

SENDER = "sergio.queiroz@buildnprice.io"
#RECIPIENT = ['vishramyadav@gmail.com', 'sergio.queiroz@buildnprice.io']
#API_GATEWAY_URL="https://cyh95hhhvj.execute-api.us-west-2.amazonaws.com/buildpricestageapi?filename="
#TO_RECIPIENT = "vishramyadav@gmail.com,sergio.queiroz@buildnprice.io"
AWS_REGION = "us-west-2"
SUBJECT = "Code Price info"
BODY_TEXT = "Hello,\r\nPlease see the attached file for a list of customers code prices.\n Please click here to BUY"
#BODY_HTML = """\
#<html>
#<head></head>
#<body>
#<h1>Hello!</h1>
#<p>Please see the attached file for a list of customers code prices.</p>
#<p>Please click here to <a href="API_GATEWAY_URL">BUY</a></p>
#</body>
#</html>
#"""
CHARSET = "utf-8"
sesClient = boto3.client('ses',region_name=AWS_REGION)


def lambda_handler(event, context):
    #print("Received event: " + json.dumps(event, indent=2))

    # Get the object from the event and show its content type
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = urllib.unquote_plus(event['Records'][0]['s3']['object']['key'].encode('utf8'))
    try:
        response = s3.get_object(Bucket=bucket, Key=key)
        print("CONTENT TYPE: " + response['ContentType'])
        #print(response)
        print(key)
        csvFileName=key[key.index('wrkflow_step5/')+14:]
        print(csvFileName)
        argsFileName=csvFileName[0:csvFileName.index('.')]
        print(argsFileName)
        API_GATEWAY_URL="https://cyh95hhhvj.execute-api.us-west-2.amazonaws.com/buildpricestageapi?filename="
        API_GATEWAY_URL=API_GATEWAY_URL+argsFileName+".json"
        
        BODY_HTML = """\
        <html>
        <head></head>
        <body>
        <h1>Hello!</h1>
        <p>Please see the attached file for a list of customers code prices.</p>
        <p>Please click here to <a href="{API_GATEWAY_URL}">BUY</a></p>
        </body>
        </html>
        """.format(API_GATEWAY_URL=API_GATEWAY_URL)
        
        fileContent=response['Body'].read().decode('utf-8')
        print(fileContent)
        emailList=getSNSSubscribtionEmails(argsFileName)
        print(emailList);
        #RECIPIENT=emailList
        #sendSNSNotification();
        sendEmailWithAttachment(fileContent,csvFileName,emailList,BODY_HTML)
        return response['ContentType']
    except Exception as e:
        print(e)
        print('Error getting object {} from bucket {}. Make sure they exist and your bucket is in the same region as this function.'.format(key, bucket))
        raise e
        
def getSNSSubscribtionEmails(fileName):
    emailList=[]
    try:
        snsTopicArn = "arn:aws:sns:us-west-2:789753010953:"+fileName
        snsRes = snsclient.list_subscriptions_by_topic(
        TopicArn=snsTopicArn
    )
    
        for record in snsRes['Subscriptions']:
            if record['Protocol'] == 'email':
                emailList.append(record['Endpoint'])
    except Exception as e:
        print(e)
        print('Error occured while getting email from sns object')
    return emailList

def sendEmailWithAttachment(fileContent,csvFileName,RECIPIENT,BODY_HTML):
    
    msg = MIMEMultipart('mixed')
    msg['Subject'] = SUBJECT 
    msg['From'] = SENDER 
    msg['To'] = ",".join(RECIPIENT) 

    msg_body = MIMEMultipart('alternative')
    textpart = MIMEText(BODY_TEXT.encode(CHARSET), 'plain', CHARSET)
    htmlpart = MIMEText(BODY_HTML.encode(CHARSET), 'html', CHARSET)

    msg_body.attach(textpart)
    msg_body.attach(htmlpart)

    att = MIMEApplication(fileContent)

    att.add_header('Content-Disposition','attachment',filename=csvFileName)

    msg.attach(msg_body)

    msg.attach(att)
    print(msg)
    try:
    
        sesResponse = sesClient.send_raw_email(
        Source=SENDER,
        Destinations=RECIPIENT
    ,
        RawMessage={
            'Data':msg.as_string(),
        }
        #,ConfigurationSetName=CONFIGURATION_SET
    )

    except ClientError as e:
        print(e.response['Error']['Message'])
    
    print("Email sent! Message ID:"),
    #print(response['ResponseMetadata']['RequestId'])
    
def sendSNSNotification():
    response = snsclient.publish(
    TopicArn=snsTopicArn,
    Message='Please see the latest list of customers code prices',
    Subject='customers code prices',
    MessageStructure='string'
)