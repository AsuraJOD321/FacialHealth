# download_model.py
import urllib.request
import bz2
import os

def download_model():
    print("Downloading face landmark model...")
    url = "https://github.com/davisking/dlib-models/raw/master/shape_predictor_68_face_landmarks.dat.bz2"
    output_bz2 = "src/models/shape_predictor_68_face_landmarks.dat.bz2"
    output_dat = "src/models/shape_predictor_68_face_landmarks.dat"
    
    # Create models directory if it doesn't exist
    os.makedirs("src/models", exist_ok=True)
    
    # Download the file
    print(f"Downloading from {url}...")
    urllib.request.urlretrieve(url, output_bz2)
    print("Download complete!")
    
    # Extract the bz2 file
    print("Extracting...")
    with bz2.open(output_bz2, 'rb') as f_in:
        with open(output_dat, 'wb') as f_out:
            f_out.write(f_in.read())
    
    # Remove the compressed file
    os.remove(output_bz2)
    print(f"Model saved to {output_dat}")
    print("Done!")

if __name__ == "__main__":
    download_model()