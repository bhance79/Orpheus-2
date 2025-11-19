# Use a slim Python image
FROM python:3.12-slim

# Set work dir inside the container
WORKDIR /app

# Install system dependencies if you ever need them (left here commented)
# RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

# Copy only requirements first (better Docker caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Now copy the rest of the project
COPY . .

# Environment tweaks (optional, but nice)
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    FLASK_ENV=production \
    FLASK_DEBUG=0

# The port your Flask app listens on
EXPOSE 5000

# Default command to run your app
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
