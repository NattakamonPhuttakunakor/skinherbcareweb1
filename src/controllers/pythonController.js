import axios from 'axios';
import FormData from 'form-data';

export const analyzeWithPython = async (req, res) => {
    console.log('------------------------------------------------');
    console.log('Python analysis bridge start');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload an image.' });
        }

        const pythonUrl = process.env.PYTHON_API_URL || 'https://finalproject-3-uprs.onrender.com/predict';
        const apiKey = process.env.PYTHON_API_KEY || process.env.API_KEY || '';

        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname || 'upload.jpg',
            contentType: req.file.mimetype || 'image/jpeg'
        });

        const headers = {
            ...formData.getHeaders()
        };
        if (apiKey) headers['x-api-key'] = apiKey;

        console.log('Sending image to Python:', pythonUrl);

        const response = await axios.post(pythonUrl, formData, {
            headers,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            timeout: 30000
        });

        return res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('Python Bridge Error:', error.message);

        if (error.response) {
            console.error('Python status:', error.response.status);
            console.error('Python data:', error.response.data);
            return res.status(error.response.status).json({
                success: false,
                message: 'Python Server Error',
                details: error.response.data
            });
        }

        return res.status(500).json({ success: false, message: 'Connection Failed' });
    }
};

export const debugPythonUpload = async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please upload an image.' });
    }
    return res.json({
        success: true,
        file: {
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size
        }
    });
};
