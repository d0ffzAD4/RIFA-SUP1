import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transactionId, status, amount, client, identifier } = req.body;
    console.log(`[WEBHOOK] Transaction ${transactionId} (${identifier}): ${status}`);

    if (status === 'OK' && identifier) {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      );

      // Confirma comprador
      await supabase
        .from('compradores')
        .update({ status: 'pago', pago_em: new Date().toISOString() })
        .eq('external_id', identifier);

      // Confirma cotas
      await supabase
        .from('cotas')
        .update({ status: 'pago' })
        .eq('external_id', identifier);

      console.log(`[SUPABASE] Compra ${identifier} confirmada como paga.`);
    }

    return res.status(200).send('OK');
  } catch (error: any) {
    console.error('[WEBHOOK ERROR]:', error.message);
    return res.status(500).send('Internal Server Error');
  }
}
