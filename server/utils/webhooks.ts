import { storage } from '../storage';
import type { Project, User } from '@shared/schema';

interface WebhookPayload {
  event_type: string;
  timestamp: string;
  project: Partial<Project>;
  user?: { email?: string; name?: string | null };
  event_data: Record<string, unknown>;
}

export async function triggerWebhook(
  projectId: number, 
  eventType: string, 
  data: Record<string, unknown>
): Promise<void> {
  try {
    const project = await storage.getProjectByIdInternal(projectId);
    if (!project) return;

    const webhookUrls: { url: string; type: string }[] = [];
    
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    const externalLosUrl = process.env.EXTERNAL_LOS_WEBHOOK_URL;
    const webhookUrlsEnv = process.env.WEBHOOK_URLS;
    
    if (n8nWebhookUrl) {
      webhookUrls.push({ url: n8nWebhookUrl, type: 'n8n' });
    }
    if (externalLosUrl) {
      webhookUrls.push({ url: externalLosUrl, type: 'external_los' });
    }
    if (webhookUrlsEnv) {
      try {
        const parsed = JSON.parse(webhookUrlsEnv);
        if (Array.isArray(parsed)) {
          webhookUrls.push(...parsed);
        }
      } catch (e) {
        console.error('Failed to parse WEBHOOK_URLS:', e);
      }
    }
    
    if (webhookUrls.length === 0) {
      console.log(`No webhook URLs configured for event ${eventType}`);
      return;
    }
    
    const payload: WebhookPayload = {
      event_type: eventType,
      timestamp: new Date().toISOString(),
      project: {
        id: project.id,
        projectNumber: project.projectNumber,
        projectName: project.projectName,
        status: project.status,
        currentStage: project.currentStage,
        progressPercentage: project.progressPercentage,
        loanAmount: project.loanAmount,
        interestRate: project.interestRate,
        loanTermMonths: project.loanTermMonths,
        loanType: project.loanType,
        propertyAddress: project.propertyAddress,
        propertyType: project.propertyType,
        borrowerName: project.borrowerName,
        borrowerEmail: project.borrowerEmail,
        borrowerPhone: project.borrowerPhone,
        targetCloseDate: project.targetCloseDate,
        createdAt: project.createdAt,
      },
      event_data: data,
    };
    
    for (const webhook of webhookUrls) {
      try {
        const webhookRecord = await storage.createProjectWebhook({
          projectId,
          webhookType: webhook.type,
          webhookUrl: webhook.url,
          triggerEvent: eventType,
          payload,
          status: 'pending',
          attempts: 0,
        });
        
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Event': eventType,
            'X-Project-Id': String(project.id),
            'X-Project-Number': project.projectNumber || '',
          },
          body: JSON.stringify(payload),
        });
        
        const responseText = await response.text();
        
        await storage.updateProjectWebhook(webhookRecord.id, {
          status: response.ok ? 'success' : 'failed',
          responseStatus: response.status,
          responseBody: responseText,
          completedAt: new Date(),
          attempts: 1,
        });
        
        console.log(`✓ Webhook sent to ${webhook.url} for event ${eventType}`);
        
      } catch (error) {
        console.error(`✗ Webhook failed for ${webhook.url}:`, error);
      }
    }
    
  } catch (error) {
    console.error('Webhook trigger error:', error);
  }
}
