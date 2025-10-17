{
  "name": "glassix-mini",
  "description": "GlassiX-Mini WhatsApp bot by Nabeed",
  "repository": "",
  "keywords": ["whatsapp","baileys","bot","glassix"],
  "env": {
    "HOST": {
      "description": "Deployment host label (Panel/Heroku/Localhost)",
      "value": "Panel"
    },
    "NODE_ENV": {
      "description": "Node environment",
      "value": "production"
    },
    "OWNER_NUMBER": {
      "description": "Owner whatsapp number (with country code, no @)",
      "value": "923XXXXXXXXX"
    },
    "OPENAI_API_KEY": {
      "description": "OpenAI API key (if using AI commands)",
      "value": ""
    }
  }
}