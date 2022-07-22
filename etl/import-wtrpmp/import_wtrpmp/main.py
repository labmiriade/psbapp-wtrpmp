from smart_open import open
import os
import boto3
import csv
import json
import itertools

from typing import List, Tuple, Set
import traceback

CSV_DATA_URLS = json.loads(os.environ.get("CSV_DATA_URLS"))

dynamodb = boto3.resource("dynamodb")
table_name = os.environ.get("DATA_TABLE")
table = dynamodb.Table(table_name)


def lower_first(iterator):
    return itertools.chain([next(iterator).lower()], iterator)


def lambda_handler(event, context):
    failed_records: List[str] = []
    categories = set()
    ids_from_csv = set()

    with table.batch_writer() as batch:
        for CSV_DATA_URL in CSV_DATA_URLS:
            try:
                print(f"START: {CSV_DATA_URL}")
                with open(CSV_DATA_URL, encoding="latin-1") as csvfile:
                    ids_from_csv_temp, categories_temp, failed_records = put_places(csvfile, batch)
                    print(f"Found {len(ids_from_csv_temp)} good records")
                    print(f"Found {len(failed_records)} bad records")
                    print(f"Found {len(categories_temp)} categories")
                    categories.update(categories_temp)
                    ids_from_csv.update(ids_from_csv_temp)
                    print(f"COMPLETE: {CSV_DATA_URL}")
            except Exception as error:
                print(f"ERROR: {CSV_DATA_URL}")
                traceback.print_exc()
                raise error

    if failed_records:
        raise Exception

    place_records = query_places()
    # cerco i record che non esistono nel CSV
    for place_record in place_records:
        id_record = place_record["pk"]["S"].replace("p-", "")
        if id_record not in ids_from_csv :
            print(f"deleting {place_record['pk']['S']}")
            update_place(place_record["pk"]["S"], "false")


def query_places():
    dynamoclient = boto3.client("dynamodb")
    query_params = {
        "TableName": table_name,
        "IndexName": "GSI1",
        "ConsistentRead": False,
        "KeyConditionExpression": "gsi1pk = :place",
        "FilterExpression": "#data.community = :false AND #data.searchable = :true",
        "ExpressionAttributeNames":{"#data": "data"},
        "ExpressionAttributeValues": {
            ":place": {"S": "place"},
            ":false": {"BOOL":False},
            ":true": {"BOOL":True},
        },
    }  # query parameters for paginated results

    response = dynamoclient.query(**query_params)
    return response["Items"]


def update_place(pk, searchable):
    table.update_item(
        Key={"pk": pk, "sk": "p-info"},
        UpdateExpression="SET #data.searchable = :searchable",
        ExpressionAttributeNames={"#data": "data"},
        ExpressionAttributeValues={":searchable": False},
    )


def get_or_error(item, key):
    key = key.lower()
    try:
        return item[key]
    except KeyError:
        print(f'{item["id"]}: Missing key: {key}')
        print(json.dumps(item))
    return ''


def put_places(csvfile, batch) -> Tuple[Set[str], Set[str], List[Exception]]:
    """
    Put all places from a csv file in a dynamodb table batch writer
    :param csvfile: the csv file to read data from
    :param batch: the Table write batch to write to
    :return: a tuple with a set of the inserted ids as first element and a list of occurred exceptions as second
    """
    ids = set()
    categories = set()
    errors = []
    reader = csv.DictReader(lower_first(csvfile), delimiter=";")
    for row in reader:
        place_id = row["id"]
        try:
            batch.put_item(
                Item={
                    "pk": "p-" + place_id,
                    "sk": "p-info",
                    "data": {
                        "placeId": place_id,
                        "istatCode": get_or_error(row, "COD_ISTAT_Comune"),
                        "streetName": get_or_error(row, "Via"),
                        "streetNumber": get_or_error(row, "Civico"),
                        "city": get_or_error(row, "Comune"),
                        "province": get_or_error(row, "Provincia"),
                        "notes": get_or_error(row, "Note"),
                        "lon": get_or_error(row, "Longitudine"),
                        "lat": get_or_error(row, "Latitudine"),
                        "searchable": True,
                        "community": False
                    },
                    "gsi1pk": "place",
                    "likes": 0,
                }
            )
            ids.add(place_id)
        except Exception as error:
            errors.append(error)
            print(f"error processing {row=} {error=} {place_id=}")
            traceback.print_exc()
    return ids, categories, errors
