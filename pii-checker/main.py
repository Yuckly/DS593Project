from flask import Flask, request, jsonify
from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
from presidio_anonymizer import AnonymizerEngine
from urllib.parse import unquote

# Initialize Flask app
app = Flask(__name__)

# Initialize the analyzer
analyzer = AnalyzerEngine()

# Create an address recognizer
address_pattern = Pattern(
    name="address_pattern",
    regex=r"\b\d{1,5}\s+([A-Za-z0-9]+\s+){1,5}(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way)\b",
    score=0.4   # base score; context boosts final score
)

address_recognizer = PatternRecognizer(
    supported_entity="ADDRESS",
    patterns=[address_pattern],
    context=[
        "address",
        "my address",
        "home address",
        "house",
        "apartment",
        "unit",
        "street",
        "st.",
        "lives at",
        "living at",
        "located at",
        "residing at"
    ]
)

# Register the address recognizer with Presidio
analyzer.registry.add_recognizer(address_recognizer)

# Initialize the anonymizer
anonymizer = AnonymizerEngine()

def is_dob_context(text, start, end):
    """Check if a date appears in DOB context"""
    window_size = 40  # chars around the date
    left = max(0, start - window_size)
    right = min(len(text), end + window_size)
    window = text[left:right].lower()

    dob_keywords = [
        "dob",
        "date of birth",
        "birth date",
        "birthdate",
        "birthday",
        "bday",
        "born",
        "year of birth"
    ]

    return any(k in window for k in dob_keywords)

def analyze_with_dob_only(text, language='en'):
    """Analyze text and filter DATE_TIME to only include DOB context"""
    raw_results = analyzer.analyze(
        text=text,
        language=language,
        score_threshold=0.0  # Get all detections including low-confidence
    )

    # Entities to filter out
    excluded_entities = ["URL", "PERSON", "LOCATION", "DATE_TIME"]
    
    filtered = []
    for r in raw_results:
        # Skip excluded entity types
        if r.entity_type in excluded_entities:
            continue
            
        # Handle DATE_TIME - only keep if in DOB context
        if r.entity_type == "DATE_TIME":
            if is_dob_context(text, r.start, r.end):
                # Relabel to custom entity for DOB
                r.entity_type = "DATE_TIME_DOB"
                filtered.append(r)
            # Otherwise, skip this DATE_TIME (not in DOB context)
        else:
            filtered.append(r)

    return filtered

def process_anonymization(text, language='en'):
    """Helper function to anonymize text"""
    # Analyze the text to detect PII with DOB filtering
    # This filters DATE_TIME to only include those in DOB context
    results = analyze_with_dob_only(text, language)
    
    # Anonymize the text
    anonymized_text = anonymizer.anonymize(text=text, analyzer_results=results)
    
    # Prepare detected PII details
    detected_pii = []
    for result in results:
        confidence = round(result.score, 2)
        # If confidence is below 0.4, categorize as "others"
        entity_type = result.entity_type if confidence >= 0.4 else "others"
        
        # Replace underscores with spaces in entity type names
        # e.g., "DATE_TIME_DOB" becomes "DATE OF BIRTH", "ADDRESS_STRONG" becomes "ADDRESS STRONG"
        entity_type = entity_type.replace('_', ' ')
        
        detected_pii.append({
            'entity_type': entity_type,
            'value': text[result.start:result.end],
            'start': result.start,
            'end': result.end,
            'confidence': confidence
        })
    
    return {
        'original_text': text,
        'anonymized_text': anonymized_text.text,
        'detected_pii': detected_pii,
        'pii_count': len(detected_pii)
    }

@app.route('/anonymize', methods=['GET', 'POST'])
def anonymize_text():
    """
    Endpoint to anonymize text containing PII.
    GET: Accepts 'text' as query parameter (browser-friendly)
    POST: Expects JSON with 'text' field
    """
    try:
        if request.method == 'GET':
            # GET request - get text from query parameter
            text = request.args.get('text', '')
            if not text:
                return jsonify({'error': 'Missing "text" query parameter. Example: /anonymize?text=Your text here'}), 400
            # URL decode the text
            text = unquote(text)
            language = request.args.get('language', 'en')
        else:
            # POST request - get text from JSON body
            data = request.get_json()
            if not data or 'text' not in data:
                return jsonify({'error': 'Missing "text" field in request body'}), 400
            text = data['text']
            language = data.get('language', 'en')
        
        result = process_anonymization(text, language)
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'presidio-anonymizer'}), 200

@app.route('/', methods=['GET'])
def index():
    """Root endpoint with usage information and simple HTML form"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Presidio Anonymization Server</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            h1 { color: #333; }
            .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .example { background: #e8f4f8; padding: 10px; margin: 10px 0; border-left: 4px solid #2196F3; }
            form { background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0; }
            textarea { width: 100%; height: 150px; padding: 10px; font-size: 14px; }
            button { background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
            button:hover { background: #45a049; }
            .result { margin-top: 20px; padding: 15px; background: #fff; border: 1px solid #ddd; border-radius: 5px; }
        </style>
    </head>
    <body>
        <h1>🔒 Presidio Anonymization Server</h1>
        
        <div class="endpoint">
            <h3>Test in Browser (GET request)</h3>
            <p>You can test directly in your browser using a URL like:</p>
            <div class="example">
                <code>http://localhost:12423/anonymize?text=Hi, my name is John Doe and my email is john@example.com</code>
            </div>
        </div>
        
        <div class="endpoint">
            <h3>Or use this form:</h3>
            <form id="anonymizeForm">
                <label for="textInput">Enter text to anonymize:</label><br>
                <textarea id="textInput" name="text" placeholder="Hi, my name is John Doe and my email is john.doe@example.com. Call me at 555-123-4567."></textarea><br><br>
                <button type="submit">Anonymize Text</button>
            </form>
            <div id="result" class="result" style="display:none;"></div>
        </div>
        
        <div class="endpoint">
            <h3>API Endpoints:</h3>
            <ul>
                <li><strong>GET /anonymize?text=...</strong> - Anonymize text (browser-friendly)</li>
                <li><strong>POST /anonymize</strong> - Anonymize text (JSON body with "text" field)</li>
                <li><strong>GET /health</strong> - Health check</li>
            </ul>
        </div>
        
        <script>
            document.getElementById('anonymizeForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                const text = document.getElementById('textInput').value;
                const resultDiv = document.getElementById('result');
                
                if (!text) {
                    resultDiv.innerHTML = '<p style="color: red;">Please enter some text.</p>';
                    resultDiv.style.display = 'block';
                    return;
                }
                
                try {
                    const encodedText = encodeURIComponent(text);
                    const response = await fetch(`/anonymize?text=${encodedText}`);
                    const data = await response.json();
                    
                    if (response.ok) {
                        let html = '<h3>Results:</h3>';
                        html += `<p><strong>Original:</strong> ${data.original_text}</p>`;
                        html += `<p><strong>Anonymized:</strong> ${data.anonymized_text}</p>`;
                        html += `<p><strong>Detected PII:</strong> ${data.pii_count} entities</p>`;
                        if (data.detected_pii.length > 0) {
                            html += '<ul>';
                            data.detected_pii.forEach(pii => {
                                html += `<li><strong>${pii.entity_type}</strong>: "${pii.value}" (confidence: ${pii.confidence})</li>`;
                            });
                            html += '</ul>';
                        }
                        resultDiv.innerHTML = html;
                    } else {
                        resultDiv.innerHTML = `<p style="color: red;">Error: ${data.error}</p>`;
                    }
                    resultDiv.style.display = 'block';
                } catch (error) {
                    resultDiv.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
                    resultDiv.style.display = 'block';
                }
            });
        </script>
    </body>
    </html>
    """
    return html

if __name__ == '__main__':
    print("Starting Presidio Anonymization Server...")
    print("Server will be available at http://localhost:12423")
    print("Open http://localhost:12423 in your browser to use the web interface")
    print("Or use GET /anonymize?text=... or POST /anonymize")
    app.run(host='0.0.0.0', port=12423, debug=True)