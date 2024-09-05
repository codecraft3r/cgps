# Use the official Python image from the Docker Hub
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements.txt file into the container
COPY requirements.txt .

# Install the dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the content of the local src directory to the working directory
COPY ./app app/

ENV PYTHONPATH=/app

# Expose the port that the app runs on
EXPOSE 8000

# Command to run the application
CMD ["fastapi", "run", "app/main.py"]