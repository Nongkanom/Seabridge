# Use an official and stable lightweight Python runtime as a parent image
FROM python:3.12-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file into the container and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application source code into the container
COPY . .

# Expose the port that Hugging Face Spaces uses for health checks and web interface
EXPOSE 7860

# Command to run the main bot application when the container starts
CMD ["python", "main.py"]