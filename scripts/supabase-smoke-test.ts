import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';

type WorkflowRun = {
  id: string;
  workflow_name: string;
  status: string;
};

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (supabaseUrl === undefined || supabaseUrl.trim() === '') {
  throw new Error('Missing required environment variable: SUPABASE_URL');
}

if (supabaseServiceRoleKey === undefined || supabaseServiceRoleKey.trim() === '') {
  throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const insertResult = await supabase
  .from('workflow_runs')
  .insert({
    workflow_name: 'smoke_test',
    status: 'completed',
    input: { source: 'scripts/supabase-smoke-test.ts' },
    output: { ok: true },
  })
  .select('id, workflow_name, status')
  .single<WorkflowRun>();

if (insertResult.error !== null) {
  if (insertResult.error.message.toLowerCase().includes('permission denied')) {
    throw new Error(
      'Failed to insert workflow_runs row: permission denied. Check that SUPABASE_SERVICE_ROLE_KEY is a service-role key and that the warehouse migration has been applied with the expected table grants.',
    );
  }

  throw new Error(`Failed to insert workflow_runs row: ${insertResult.error.message}`);
}

const insertedRun = insertResult.data;

const readResult = await supabase
  .from('workflow_runs')
  .select('id, workflow_name, status')
  .eq('id', insertedRun.id)
  .single<WorkflowRun>();

if (readResult.error !== null) {
  throw new Error(`Failed to read workflow_runs row: ${readResult.error.message}`);
}

if (readResult.data.id !== insertedRun.id) {
  throw new Error('Read-back workflow_runs row id did not match inserted id.');
}

console.log('Supabase smoke test passed');
console.log(`workflow_run id: ${insertedRun.id}`);
