from fastapi import FastAPI
import pandas as pd
import joblib
from pydantic import BaseModel,Field
from fastapi.middleware.cors import CORSMiddleware

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

COLUMNS=['neighbourhood_group', 'neighbourhood', 'latitude', 'longitude',
       'room_type', 'price', 'minimum_nights', 'number_of_reviews',
       'reviews_per_month', 'calculated_host_listings_count',
       'availability_365']

model=joblib.load("Model_Pipeline.pkl")

#Pydantic model = the input validation
class Features(BaseModel):
    latitude: float = Field(..., ge=-90, le=90,description="latitude must be between -90 and 90")
    longitude:float = Field(..., ge=-180,le=180,description="Longitude coordinate")
    price: float = Field(..., ge=0, description="Price per night must be positive")
    minimum_nights: int = Field(...,ge=1,le=365,description="Minimum nights required for booking")
    number_of_reviews: int = Field(...,ge=0, description="Total number of Reviews")
    reviews_per_month: float = Field(...,ge=0,description="Aveg reviews per month")
    calculated_host_listing_count: int = Field(...,ge=0,description="Number of listing by this host")
    availability_365: int = Field(...,e=0, le=365,description="Days available out of 365")
    neighbourhood_group: str = Field(...,min_length=1,description="Neighbourhood grp")
    neighbourhood: str = Field(..., min_length=1, description="Specific neighbourhood name")
    






@app.get('/')
def greet():
    return "Hello Guyss"

# @app.post('/predict')
# def predict(features: Features): # user ne features diii..usko hamne Dictionary mai change kr diyaa
#     row=pd.DatFrame([features.dict()],columns=COLUMNS) # pandas apne aap mai shape ke tarah behave krne lagta hai
#     prediction = model.predict(row)
#     probability=model.predict_proba(row)
    
#     return {
#         "Predicted_room_type" : prediction[0],
#         "Probability" : probability.tolist()
#     }

@app.post("/predict")
def predict(features: Features):
    row = pd.DataFrame(
        [features.model_dump()],
        columns=COLUMNS
    )

    prediction = model.predict(row)
    probability = model.predict_proba(row)

    return {
        "Predicted_room_type": str(prediction[0]),
        "Probability": probability.tolist()
    }


# import joblib
# import os

# # Load your existing trained model
# model = joblib.load("Model_Pipeline.pkl")

# # Save with maximum compression
# joblib.dump(
#     model,
#     "Model_Pipeline_compressed.pkl",
#     compress=9
# )

# size_mb = os.path.getsize(
#     "Model_Pipeline_compressed.pkl"
# ) / (1024 * 1024)

# print(f"Compressed size: {size_mb:.2f} MB")


import gzip
import shutil
import os

input_file = "Model_Pipeline.pkl"
output_file = "Model_Pipeline.pkl.gz"

with open(input_file, "rb") as f_in:
    with gzip.open(output_file, "wb", compresslevel=9) as f_out:
        shutil.copyfileobj(f_in, f_out)

size_mb = os.path.getsize(output_file) / (1024 * 1024)

print(f"New file size: {size_mb:.2f} MB")
print("Saved at:", os.path.abspath(output_file))