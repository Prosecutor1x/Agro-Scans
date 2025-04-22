from fastapi import FastAPI, Request, UploadFile, Form, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import shutil
import os
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import load_img, img_to_array
import ollama
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uuid

app = FastAPI()

# Allow all origins (you can restrict this to your Next.js frontend URL in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can replace "*" with your frontend URL in production (e.g., ["http://localhost:3000"])
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Your existing routes here..



# Static and templates configuration
UPLOAD_FOLDER = 'uploads/output'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
# If your uploaded files are in 'uploads' folder
app.mount("/uploads/output", StaticFiles(directory="uploads/output"), name="uploads")

# Load trained plant disease model
model = load_model('models/plant.h5')

# Class labels for predictions
class_names = [
    'Pepper bell Bacterial_spot', 'Pepper bell healthy',
    'Potato Early blight', 'Potato Late blight', 'Potato healthy',
    'Tomato Bacterial spot', 'Tomato Early blight', 'Tomato Late blight',
    'Tomato Leaf Mold', 'Tomato Septoria leaf spot',
    'Tomato Spider mites Two spotted spider mite', 'Tomato Target Spot',
    'Tomato YellowLeaf Curl Virus', 'Tomato Tomato mosaicvirus',
    'Tomato healthy'
]



@app.post("/predict")
async def predict(image: UploadFile = File(...)):
    if not image.filename:
        raise HTTPException(status_code=400, detail="No image uploaded")

    file_location = os.path.join(UPLOAD_FOLDER, image.filename)
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    # Preprocess image
    img = load_img(file_location, target_size=(256, 256))
    img_array = img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    # Make prediction
    prediction = model.predict(img_array)
    predicted_class = class_names[np.argmax(prediction)]

    return JSONResponse({
        "prediction": predicted_class,
        "image_path": f"http://localhost:8000/uploads/output/{image.filename}"
    })


# @app.post("/know_more")
# async def know_more(disease: str = Form(...)):
    if not disease:
        raise HTTPException(status_code=400, detail="No disease name provided")

    prompt = f"Give a brief treatment and solution for the plant disease called '{disease}' in simple terms."

    try:
        response = ollama.chat(
            model='deepseek-r1:1.5b',
            messages=[{"role": "user", "content": prompt}]
        )
        summary = response['message']['content']
    except Exception:
        summary = "Sorry, something went wrong while fetching the solution."

    return JSONResponse({
        "disease": disease,
        "summary": summary
    })


from pydantic import BaseModel

class DiseaseRequest(BaseModel):
    disease: str

@app.post("/know_more")
async def know_more(request: DiseaseRequest):
    disease = request.disease
    if not disease:
        raise HTTPException(status_code=400, detail="No disease name provided")

    prompt = f"Give a brief Explanation and treatment and solution for the plant disease called '{disease}' in simple terms."

    try:
        response = ollama.chat(
            model='deepseek-r1:1.5b',
            messages=[{"role": "user", "content": prompt}]
        )
        summary = response['message']['content']
    except Exception:
        summary = "Sorry, something went wrong while fetching the solution."

    return JSONResponse({
        "disease": disease,
        "summary": summary
    })

UPLOAD_DIR = "D:/Work/newcollegeproj/backend/uploads"

@app.post("/upload_capture")
async def upload_capture(file: UploadFile = File(...)):
    # Create unique filename
    unique_name = f"{uuid.uuid4()}.jpg"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    return {"message": "File uploaded successfully", "file_path": file_path}