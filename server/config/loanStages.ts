export interface TaskTemplate {
  task_title: string;
  task_type: string;
  priority: string;
  requires_document?: boolean;
  visible_to_borrower: boolean;
  borrower_action_required?: boolean;
}

export interface StageTemplate {
  stage_name: string;
  stage_key: string;
  stage_order: number;
  stage_description: string;
  estimated_duration_days: number;
  visible_to_borrower: boolean;
  tasks: TaskTemplate[];
}

export const LOAN_CLOSING_STAGES: StageTemplate[] = [
  {
    stage_name: 'Initial Documentation',
    stage_key: 'documentation',
    stage_order: 1,
    stage_description: 'Collecting initial loan application and required documents',
    estimated_duration_days: 3,
    visible_to_borrower: true,
    tasks: [
      {
        task_title: 'Loan Application Submitted',
        task_type: 'document_upload',
        priority: 'critical',
        requires_document: true,
        visible_to_borrower: true,
        borrower_action_required: true
      },
      {
        task_title: 'Financial Statements Collected',
        task_type: 'document_upload',
        priority: 'high',
        requires_document: true,
        visible_to_borrower: true,
        borrower_action_required: true
      },
      {
        task_title: 'Tax Returns (Last 2 Years)',
        task_type: 'document_upload',
        priority: 'high',
        requires_document: true,
        visible_to_borrower: true,
        borrower_action_required: true
      },
      {
        task_title: 'Property Information Package',
        task_type: 'document_upload',
        priority: 'medium',
        requires_document: true,
        visible_to_borrower: true,
        borrower_action_required: true
      },
      {
        task_title: 'Proof of Insurance',
        task_type: 'document_upload',
        priority: 'medium',
        requires_document: true,
        visible_to_borrower: true,
        borrower_action_required: true
      }
    ]
  },
  {
    stage_name: 'Document Review',
    stage_key: 'document_review',
    stage_order: 2,
    stage_description: 'Internal review of submitted documentation',
    estimated_duration_days: 2,
    visible_to_borrower: true,
    tasks: [
      {
        task_title: 'Application Completeness Check',
        task_type: 'review',
        priority: 'critical',
        visible_to_borrower: false
      },
      {
        task_title: 'Financial Analysis',
        task_type: 'review',
        priority: 'high',
        visible_to_borrower: false
      },
      {
        task_title: 'Property Review',
        task_type: 'review',
        priority: 'high',
        visible_to_borrower: false
      },
      {
        task_title: 'Request Additional Documents (if needed)',
        task_type: 'collection',
        priority: 'medium',
        visible_to_borrower: true
      }
    ]
  },
  {
    stage_name: 'Third-Party Orders',
    stage_key: 'third_party_orders',
    stage_order: 3,
    stage_description: 'Ordering appraisals, title reports, and other third-party services',
    estimated_duration_days: 7,
    visible_to_borrower: true,
    tasks: [
      {
        task_title: 'Property Appraisal Ordered',
        task_type: 'scheduling',
        priority: 'critical',
        visible_to_borrower: true
      },
      {
        task_title: 'Title Report Ordered',
        task_type: 'scheduling',
        priority: 'critical',
        visible_to_borrower: true
      },
      {
        task_title: 'Environmental Phase I Ordered',
        task_type: 'scheduling',
        priority: 'high',
        visible_to_borrower: true
      },
      {
        task_title: 'Survey Ordered',
        task_type: 'scheduling',
        priority: 'medium',
        visible_to_borrower: true
      },
      {
        task_title: 'Appraisal Received',
        task_type: 'collection',
        priority: 'critical',
        requires_document: true,
        visible_to_borrower: true
      },
      {
        task_title: 'Title Report Received',
        task_type: 'collection',
        priority: 'critical',
        requires_document: true,
        visible_to_borrower: true
      }
    ]
  },
  {
    stage_name: 'Underwriting',
    stage_key: 'underwriting',
    stage_order: 4,
    stage_description: 'Detailed loan underwriting and risk assessment',
    estimated_duration_days: 5,
    visible_to_borrower: true,
    tasks: [
      {
        task_title: 'Credit Review Completed',
        task_type: 'review',
        priority: 'critical',
        visible_to_borrower: false
      },
      {
        task_title: 'Property Valuation Review',
        task_type: 'review',
        priority: 'critical',
        visible_to_borrower: false
      },
      {
        task_title: 'Debt Service Coverage Analysis',
        task_type: 'review',
        priority: 'high',
        visible_to_borrower: false
      },
      {
        task_title: 'Title Review',
        task_type: 'review',
        priority: 'high',
        visible_to_borrower: false
      },
      {
        task_title: 'Environmental Review',
        task_type: 'review',
        priority: 'medium',
        visible_to_borrower: false
      },
      {
        task_title: 'Underwriting Memo Prepared',
        task_type: 'review',
        priority: 'critical',
        visible_to_borrower: false
      }
    ]
  },
  {
    stage_name: 'Credit Approval',
    stage_key: 'approval',
    stage_order: 5,
    stage_description: 'Final credit decision and loan approval',
    estimated_duration_days: 3,
    visible_to_borrower: true,
    tasks: [
      {
        task_title: 'Credit Committee Review',
        task_type: 'approval',
        priority: 'critical',
        visible_to_borrower: false
      },
      {
        task_title: 'Credit Committee Approval',
        task_type: 'approval',
        priority: 'critical',
        visible_to_borrower: true
      },
      {
        task_title: 'Loan Terms Finalized',
        task_type: 'approval',
        priority: 'high',
        visible_to_borrower: true
      },
      {
        task_title: 'Commitment Letter Issued',
        task_type: 'document_upload',
        priority: 'critical',
        requires_document: true,
        visible_to_borrower: true
      },
      {
        task_title: 'Commitment Letter Signed',
        task_type: 'document_upload',
        priority: 'critical',
        requires_document: true,
        visible_to_borrower: true,
        borrower_action_required: true
      }
    ]
  },
  {
    stage_name: 'Closing Preparation',
    stage_key: 'closing_prep',
    stage_order: 6,
    stage_description: 'Preparing all closing documents and final requirements',
    estimated_duration_days: 7,
    visible_to_borrower: true,
    tasks: [
      {
        task_title: 'Closing Documents Prepared',
        task_type: 'document_upload',
        priority: 'critical',
        visible_to_borrower: false
      },
      {
        task_title: 'Title Insurance Ordered',
        task_type: 'scheduling',
        priority: 'critical',
        visible_to_borrower: true
      },
      {
        task_title: 'Final Insurance Binder Obtained',
        task_type: 'collection',
        priority: 'critical',
        requires_document: true,
        visible_to_borrower: true,
        borrower_action_required: true
      },
      {
        task_title: 'Survey Completed',
        task_type: 'verification',
        priority: 'high',
        visible_to_borrower: true
      },
      {
        task_title: 'Title Commitment Received',
        task_type: 'collection',
        priority: 'critical',
        requires_document: true,
        visible_to_borrower: true
      },
      {
        task_title: 'Legal Review Completed',
        task_type: 'review',
        priority: 'high',
        visible_to_borrower: false
      },
      {
        task_title: 'Closing Statement Prepared',
        task_type: 'document_upload',
        priority: 'critical',
        visible_to_borrower: true
      }
    ]
  },
  {
    stage_name: 'Closing Scheduled',
    stage_key: 'closing_scheduled',
    stage_order: 7,
    stage_description: 'Final closing coordination and scheduling',
    estimated_duration_days: 3,
    visible_to_borrower: true,
    tasks: [
      {
        task_title: 'Closing Date Scheduled',
        task_type: 'scheduling',
        priority: 'critical',
        visible_to_borrower: true
      },
      {
        task_title: 'Closing Location Confirmed',
        task_type: 'scheduling',
        priority: 'high',
        visible_to_borrower: true
      },
      {
        task_title: 'Title Company Confirmed',
        task_type: 'scheduling',
        priority: 'high',
        visible_to_borrower: true
      },
      {
        task_title: 'Final Walkthrough Completed',
        task_type: 'verification',
        priority: 'medium',
        visible_to_borrower: true
      },
      {
        task_title: 'Wire Instructions Sent',
        task_type: 'document_upload',
        priority: 'critical',
        visible_to_borrower: true
      }
    ]
  },
  {
    stage_name: 'Closing',
    stage_key: 'closing',
    stage_order: 8,
    stage_description: 'Document execution and loan closing',
    estimated_duration_days: 1,
    visible_to_borrower: true,
    tasks: [
      {
        task_title: 'Closing Documents Executed',
        task_type: 'document_upload',
        priority: 'critical',
        requires_document: true,
        visible_to_borrower: true
      },
      {
        task_title: 'Funds Wired to Title',
        task_type: 'verification',
        priority: 'critical',
        visible_to_borrower: false
      },
      {
        task_title: 'Title Insurance Issued',
        task_type: 'collection',
        priority: 'critical',
        requires_document: true,
        visible_to_borrower: true
      },
      {
        task_title: 'Loan Documents Recorded',
        task_type: 'verification',
        priority: 'critical',
        visible_to_borrower: true
      }
    ]
  },
  {
    stage_name: 'Post-Closing & Funding',
    stage_key: 'post_closing',
    stage_order: 9,
    stage_description: 'Final documentation and loan setup',
    estimated_duration_days: 2,
    visible_to_borrower: true,
    tasks: [
      {
        task_title: 'Final Title Policy Received',
        task_type: 'collection',
        priority: 'high',
        requires_document: true,
        visible_to_borrower: true
      },
      {
        task_title: 'Recorded Documents Filed',
        task_type: 'document_upload',
        priority: 'high',
        visible_to_borrower: false
      },
      {
        task_title: 'Loan Servicing Setup',
        task_type: 'verification',
        priority: 'medium',
        visible_to_borrower: false
      },
      {
        task_title: 'Borrower Welcome Package Sent',
        task_type: 'document_upload',
        priority: 'medium',
        visible_to_borrower: true
      },
      {
        task_title: 'Loan Funded',
        task_type: 'verification',
        priority: 'critical',
        visible_to_borrower: true
      }
    ]
  }
];
