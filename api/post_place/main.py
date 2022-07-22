from operator import add, truediv
import os
import re
from typing import Any, Tuple
import boto3
import json
import time
from decimal import Decimal
from cap_to_istat import cap_to_istat

location = boto3.client("location")
dynamodb = boto3.resource("dynamodb")
table_name = os.environ.get("DATA_TABLE")
table = dynamodb.Table(table_name)

IndexName = os.environ.get("PLACE_INDEX_NAME")
BiasPosition = [11.4808746, 45.5502005]
MaxResults = 1
Language = "it"
exp = r"([a-zA-Z0-9 ]+)\s+([0-9a-zA-Z\-\/]+,)\s+([0-9]+),\s+([a-zA-Z]+),\s+[a-zA-Z]+,\s+[a-zA-Z]+"


def lambda_handler(event, context):
    print(event)
    body = json.loads(event.get("body"))
    notes = body.get("description", "")
    address = f"{body.get('address','')}, Vicenza, ITA"
    lat = body.get("lat", "")
    lon = body.get("lon", "")
    # check data
    processed_data = process_data(address, notes, lat, lon)
    if processed_data:
        data = processed_data

        # parse to correct object (placeId = COM-now timestamp)
        place_id = f"COM-{int(time.time())}"
        item_data = {
            "placeId": place_id,  # epoch timestamp casted to int to remove milliseconds
            "istatCode": cap_to_istat.get(data.get("CAP_code")),
            "streetName": data.get("street_name", ""),
            "streetNumber": data.get("street_number", ""),
            "notes": data.get("notes", ""),
            "city": data.get("city", ""),
            "province": "VICENZA",
            "lat": data.get("lat", ""),
            "lon": data.get("lon", ""),
            "searchable": True,
            "community": True,
        }

        item = {
            "pk": place_id,
            "sk": "p-info",
            "gsi1pk": "place",
            "data": item_data,
            "likes": 0,
        }
        # put place

        table.put_item(Item=item)

        return {"statusCode": 200, "body": ""}
    else:
        return {"statusCOde": 400, "body": ""}


def process_data(address: str, notes: str, lat: str, lon: str) -> Any:
    street_name = ""
    street_number = ""
    CAP_code = ""
    city = ""
    # First check if lat and lon are set since they are the most important, if not search by address
    if (
        lat != ""
        and lon != ""
        and lon.replace(".", "", 1).isdigit()
        and lat.replace(".", "", 1).isdigit()
    ):  # Find address from coordinates
        Position = [float(lon), float(lat)]
        locations = location.search_place_index_for_position(
            IndexName=IndexName,
            MaxResults=MaxResults,
            Language=Language,
            Position=Position,
        )
        if len(locations.get("Results")) > 0:
            place = locations.get("Results")[0].get("Place", {})
            address = place.get("Label")
            street_name = place.get("Street")
            street_number = place.get("Address Number")
            CAP_code = place.get("PostalCode")
            city = place.get("Municipality")
    elif lat == "" and lon == "":  # Find coords from address
        Text = address
        FilterCountries = ["ITA"]
        locations = location.search_place_index_for_text(
            IndexName=IndexName,
            BiasPosition=BiasPosition,
            MaxResults=MaxResults,
            Language=Language,
            Text=Text,
            FilterCountries=FilterCountries,
        )
        place = locations.get("Results")[0].get("Place", {})
        address = place.get("Label")
        street_name = place.get("Street")
        street_number = place.get("Address Number", "")
        CAP_code = place.get("PostalCode")
        city = place.get("Municipality")
        lon = str(place.get("Geometry", {}).get("Point", [])[0])
        lat = str(place.get("Geometry", {}).get("Point", [])[1])
    if street_name and CAP_code and city and lat and lon:
        return {
            "address": address,
            "street_name": street_name,
            "street_number": street_number,
            "CAP_code": CAP_code,
            "notes": notes,
            "city": city,
            "lat": lat,
            "lon": lon,
        }
    else:
        return None
