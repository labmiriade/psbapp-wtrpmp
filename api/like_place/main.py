import os
import boto3
import json

dynamodb = boto3.resource("dynamodb")
table_name = os.environ.get("DATA_TABLE")
table = dynamodb.Table(table_name)


def handler(event, context):
    placeId = event.get("pathParameters", {}).get("placeId")
    res = {}
    item = table.get_item(Key={"pk": f"p-{placeId}", "sk": "p-info"}).get("Item", {})
    if item:
        likes = item.get("likes", 0)
        res = table.update_item(
            Key={"pk": f"p-{placeId}", "sk": "p-info"},
            UpdateExpression="SET #likes = :increased",
            ExpressionAttributeValues={":increased": likes + 1},
            ExpressionAttributeNames={"#likes": "likes"},
            ReturnValues="ALL_NEW",
        )
        print(res)
    if res.get("Attributes"):
        res["Attributes"]["data"]["likes"] = int(res["Attributes"]["likes"])
        return {"statusCode": 200, "body": json.dumps(res["Attributes"]["data"])}
    else:
        return {"statusCode": 444, "body": f"Il luogo {placeId} non esiste"}
