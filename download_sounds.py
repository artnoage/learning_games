import os
import urllib.request

# Create sounds directory if it doesn't exist
if not os.path.exists('sounds'):
    os.makedirs('sounds')

# URLs for free sound effects (these are placeholder URLs - replace with actual sound files)
sound_urls = {
    'match.mp3': 'https://assets.mixkit.co/sfx/preview/mixkit-unlock-game-notification-253.mp3',
    'wrong.mp3': 'https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3',
    'levelup.mp3': 'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3'
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
