import os
import urllib.request

# Create sounds directory if it doesn't exist
if not os.path.exists('sounds'):
    os.makedirs('sounds')

# URLs for free sound effects from GitHub (more reliable hosting)
sound_urls = {
    'match.mp3': 'https://raw.githubusercontent.com/iamcodemaker/euca/master/sounds/click.mp3',
    'wrong.mp3': 'https://raw.githubusercontent.com/iamcodemaker/euca/master/sounds/error.mp3',
    'levelup.mp3': 'https://raw.githubusercontent.com/iamcodemaker/euca/master/sounds/success.mp3'
}

# Download each sound file
for filename, url in sound_urls.items():
    filepath = os.path.join('sounds', filename)
    if not os.path.exists(filepath):
        print(f"Downloading {filename}...")
        try:
            urllib.request.urlretrieve(url, filepath)
            print(f"Downloaded {filename} successfully")
        except Exception as e:
            print(f"Error downloading {filename}: {e}")
    else:
        print(f"{filename} already exists")

print("All sound files downloaded!")
