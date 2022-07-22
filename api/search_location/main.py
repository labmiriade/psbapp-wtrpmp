import os
from re import L, T
from typing import Any
import boto3
import json
from decimal import Decimal

location = boto3.client("location")


def lambda_handler(event, context):
    #   need router for different types
    # loc_type = event.get("pathParameters", {}).get("type") #wrong for now, its in path (resource but not as path parameter (/search/location/{type}/ text or nothing
    print(event)
    loc_type = event["resource"].split("/")[3]  #   /search/location/type

    IndexName = os.environ.get("PLACE_INDEX_NAME")
    BiasPosition = [11.4808746, 45.5502005]
    MaxResults = 1
    Language = "it"

    res = {}
    if loc_type == "text":
        search_text = event.get("queryStringParameters", {}).get("text", "")
        Text = search_text
        FilterCountries = ["ITA"]
        locations = location.search_place_index_for_text(
            IndexName=IndexName,
            BiasPosition=BiasPosition,
            MaxResults=MaxResults,
            Language=Language,
            Text=Text,
            FilterCountries=FilterCountries,
        )
        if len(locations.get("Results", [])) == 0:
            res["suggestions"] = location.search_place_index_for_suggestions(
                IndexName=IndexName,
                BiasPosition=BiasPosition,
                MaxResults=MaxResults,
                Language=Language,
                Text=Text,
                FilterCountries=FilterCountries,
            ).get(
                "Results"
            )  #   TODO FORMAT (just get label)
            res["coordinates"] = []
        else:
            res["coordinates"] = {
                "longitude": locations.get("Results")[0]
                .get("Place", {})
                .get("Geometry", {})
                .get("Point", [])[0],
                "latitude": locations.get("Results")[0]
                .get("Place", {})
                .get("Geometry", {})
                .get("Point", [])[1],
            }
            res["suggestions"] = []
        #   if this gives 0 results send suggestion list
    elif loc_type == "position":
        search_lon = event.get("queryStringParameters", {}).get("lon", "")
        search_lat = event.get("queryStringParameters", {}).get("lat", "")
        if (
            search_lon.replace(".", "", 1).isdigit()
            and search_lat.replace(".", "", 1).isdigit()
        ):
            Position = [float(search_lon), float(search_lat)]
            locations = location.search_place_index_for_position(
                IndexName=IndexName,
                MaxResults=MaxResults,
                Language=Language,
                Position=Position,
            )
            print(json.dumps(locations))
            if len(locations.get("Results", [])) > 0:
                res["address"] = (
                    locations.get("Results")[0].get("Place", {}).get("Label")
                )

    print(json.dumps(res))
    if res != {}:
        return {"statusCode": 200, "body": json.dumps(res)}
    else:
        return {
            "statusCode": 444,
            "body": f"Non siamo riusciti a trovare il luogo cercato",
        }


def convert_to_place(source: Any):
    return {"Comune": "", "Indirizzo": ""}
