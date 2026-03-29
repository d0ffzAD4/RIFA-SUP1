import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers (caso precise)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const {
      amount,
      description,
      external_id,
      payer_name,
      payer_email,
      payer_cpf,
      payer_phone,
    } = req.body;

    if (!process.env.AMPLOPAY_CLIENT_ID || !process.env.AMPLOPAY_CLIENT_SECRET) {
      console.error('Missing Amplopay API credentials.');
      return res.status(500).json({ error: 'Configuração da API incompleta.' });
    }

    const numericAmount = parseFloat(amount);

    // Vencimento: amanhã
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = tomorrow.toISOString().split('T')[0];

    const appUrl = process.env.APP_URL || 'https://seu-dominio.vercel.app';
    const callbackUrl = `${appUrl}/api/pix/callback`;

    const payload = {
      identifier: external_id,
      amount: numericAmount,
      client: {
        name: payer_name,
        email: payer_email,
        phone: payer_phone,
        document: payer_cpf,
      },
      products: [
        {
          id: 'rifa_carnes_001',
          name: description,
          quantity: 1,
          price: numericAmount,
        },
      ],
      dueDate,
      callbackUrl,
    };

    const response = await fetch(process.env.AMPLOPAY_BASE_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-public-key': process.env.AMPLOPAY_CLIENT_ID,
        'x-secret-key': process.env.AMPLOPAY_CLIENT_SECRET,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Amplopay error:', data);
      return res.status(response.status).json({ error: 'Erro na API Amplopay', details: data });
    }

    console.log('Amplopay response:', data);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Unexpected error:', error.message);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
}
