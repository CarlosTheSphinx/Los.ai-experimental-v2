**Lendry.AI**

**UI/UX Design Playbook**

For Sticky, Easy-to-Use Fintech SaaS

Deep Research Edition \| February 2026

**1. Why UI/UX Is Mission-Critical for Lendry.AI**

The lending software market is saturated. Lenders and loan officers will
evaluate your platform in seconds, and if the interface feels confusing
or untrustworthy, they won\'t come back. The research is unambiguous on
this point:

  ---------------------------------------------------------------- ----------------------------
  **Stat**                                                         **Source**
  Users form an opinion of your UI in 50 milliseconds              Nielsen Norman Group
  75% of users judge credibility by UI design                      Stanford University
  Superior UIs reduce churn by 30%                                 ProfitWell
  Users are 5x more likely to abandon if navigation is confusing   Nielsen Norman Group
  73% of users would switch financial platforms for better UX      Webstacks Fintech UX Study
  Good UX reduces support tickets by up to 40%                     Zendesk / Monetizely
  ---------------------------------------------------------------- ----------------------------

**2. Essential UI/UX Terms You Need to Know**

Before you design, you need to speak the language. These are the core
terms used by every designer, developer, and product manager in the SaaS
world.

  -------------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Term**                               **Definition**
  **UI (User Interface)**                The visual layer of your app --- every button, color, input field, icon, and screen a user sees and touches. This is what Lendry looks like.
  **UX (User Experience)**               The overall experience of using the product --- how intuitive it feels, how fast tasks are completed, and whether the user feels confident and in control. This is how Lendry feels.
  **Information Architecture (IA)**      How content and features are organized and structured. Bad IA means users can\'t find what they need. For Lendry, IA governs how deals, documents, borrowers, and settings are grouped.
  **User Flow**                          The path a user takes to complete a task. Example: \'Submit a DSCR deal\' is a user flow with 5--8 steps. Map these before building screens.
  **Wireframe**                          A low-fidelity, grayscale layout sketch of a screen. Shows structure without color or branding. Used to validate layout before coding.
  **Prototype**                          A clickable mock of your app (often built in Figma) used to test the experience before development.
  **Mockup**                             A high-fidelity, static visual design showing final colors, fonts, and components --- but not clickable.
  **Cognitive Load**                     The mental effort required to use your interface. High cognitive load = users make errors, get confused, and quit. Every unnecessary element on screen increases it.
  **Progressive Disclosure**             Showing only what the user needs at each step. Don\'t show all 40 loan fields on page 1. Reveal complexity gradually as the user progresses through a deal.
  **Affordance**                         A visual cue that tells users what they can do. A raised button \'affords\' clicking. A text field with a cursor \'affords\' typing. Poor affordances cause click confusion.
  **Heuristics**                         Broad usability guidelines used to evaluate UI quality. Jakob Nielsen\'s 10 heuristics (Nielsen Norman Group) are the gold standard for evaluating any interface.
  **Visual Hierarchy**                   Using size, weight, color, and spacing to tell users where to look first. The most important action on a screen should be visually dominant.
  **Microcopy**                          The small bits of text in your interface: button labels, error messages, placeholder text, tooltips. \'Submit Application\' is better microcopy than \'Send\'.
  **Microinteraction**                   A small animation or feedback moment when a user takes an action: a button changing color on hover, a form field turning red on error, a spinner while processing. These build trust.
  **Onboarding**                         The process of getting a new user up to speed quickly. In B2B SaaS, onboarding determines whether lenders or brokers adopt your tool or abandon it within a week.
  **Empty State**                        What a user sees before they\'ve added any data. \'You have no active deals yet\' is an empty state. Good empty states guide users to take action rather than staring at a blank screen.
  **Design System**                      A reusable library of components (buttons, cards, modals, tables) with consistent rules. Ensures visual consistency across all screens. Tailwind CSS is your design system layer in Replit.
  **Responsive Design**                  A UI that adapts fluidly to different screen sizes --- desktop, tablet, mobile. Loan officers often check deals on mobile; your UI must work there.
  **Accessibility (a11y)**               Designing for users with disabilities: vision, motor, cognitive. WCAG 2.1 is the compliance standard. Even in B2B, enterprise clients may require it.
  **WCAG 2.1**                           Web Content Accessibility Guidelines. Level AA is the minimum for professional SaaS: includes contrast ratios, keyboard navigation, and screen reader support.
  **Churn**                              When users stop using your product. Poor UX is the \#1 cause of churn in SaaS. Sticky UI design actively fights churn.
  **Stickiness**                         How well your product retains users and pulls them back. Built through habit loops, personalization, workflow integration, and making switching feel costly.
  **Habit Loop**                         Trigger → Action → Reward. Design these intentionally: e.g., email notification of a deal status change (trigger) → user logs in (action) → sees a clear status dashboard (reward).
  **JTBD (Jobs to Be Done)**             A framework for understanding what \'job\' users are hiring your product to do. A lender isn\'t using Lendry \'to click buttons\' --- they\'re using it \'to close deals faster with less paper.\'
  **Card Sorting**                       A UX research method where users organize topics into groups. Used to validate your IA and ensure your nav structure matches how lenders actually think about loan workflows.
  **Usability Testing**                  Watching real users interact with your app to identify confusion, errors, and friction points. Even testing with 5 users catches 85% of problems (Nielsen Norman Group).
  **A/B Testing**                        Showing two versions of a UI element to different user groups to see which performs better. Useful for testing button copy, onboarding flows, and dashboard layouts.
  **Heat Map**                           A visual overlay showing where users click, scroll, and hover. Identifies dead zones and confusion areas. Tools: Hotjar, Mouseflow.
  **Toast Notification**                 A brief, non-blocking message that appears on screen to confirm an action: \'Deal saved successfully.\' Critical for trust in a lending platform where status confirmation matters.
  **Skeleton Screen**                    A loading placeholder that shows the shape of content before it loads. Reduces perceived wait time compared to a blank spinner. Used in dashboards with heavy data.
  **Role-Based Access Control (RBAC)**   Different users see different features based on their role (admin vs. broker vs. lender). The UX must handle this without creating a confusing, diminished experience for lower-permission users.
  **Conversion Rate**                    The % of users who complete a desired action (e.g., submit a deal, complete onboarding). A key metric tied directly to UX quality.
  **Time to Value (TTV)**                How long it takes a new user to experience the core benefit of your product. Shorter TTV = faster adoption. Lendry\'s TTV should be measured by \'time to first submitted deal.\'
  -------------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**3. The UX Framework for Lendry.AI**

Nielsen Norman Group\'s foundational UX model divides product quality
into three layers. Master these in order --- utility first, usability
second, desirability third.

  --------------------- ------------------------------ -----------------------------------------------------------------------------------------------------------
  **Layer**             **Definition**                 **Lendry.AI Application**
  **1. Utility**        Does it solve real problems?   Automated document processing, deal tracking, AI credit policy --- these must exist before anything else.
  **2. Usability**      Can users operate it easily?   A broker should submit a deal in under 5 minutes without reading a manual.
  **3. Desirability**   Does it feel good to use?      Clean visual design, smooth animations, a professional aesthetic that signals trust and credibility.
  --------------------- ------------------------------ -----------------------------------------------------------------------------------------------------------

**4. Nielsen Norman Group\'s 10 Usability Heuristics (Applied to
Lendry)**

These are the industry\'s gold-standard design rules, published by Jakob
Nielsen and used to evaluate every major enterprise product. Apply all
10 to Lendry.

+----------------------------------------------------------------------+
| **What are heuristics?**                                             |
|                                                                      |
| Broad rules of thumb for interface design --- not rigid laws, but    |
| tested principles that catch the majority of UX problems. Running a  |
| \'heuristic evaluation\' means checking your UI against all 10       |
| before shipping.                                                     |
+----------------------------------------------------------------------+

**1. Visibility of System Status**

The design should always keep users informed about what is going on
through appropriate feedback within a reasonable amount of time.

Lendry application: Show real-time deal status (In Review, Docs
Requested, Approved, Declined). Show upload progress bars. Show a
spinner when AI is processing a document. Never let users wonder if
their action worked.

**2. Match Between System and the Real World**

Use language and concepts that match how your users think --- not
internal engineering terms.

Lendry application: Say \'Loan Amount\' not \'Principal Balance Field.\'
Say \'Upload Borrower Documents\' not \'Attach Entity to Record.\'
Lenders and brokers speak commercial real estate --- speak it back to
them.

**3. User Control and Freedom**

Users often make mistakes. They need a clearly marked \'emergency exit\'
to undo or go back without penalty.

Lendry application: Let brokers save a deal draft without submitting.
Allow editing after submission with a clear revision workflow. Include
\'Back\' buttons on every multi-step form. Never trap users in a flow
they cannot exit.

**4. Consistency and Standards**

Users should not have to wonder whether different words, situations, or
actions mean the same thing.

Lendry application: Use the same button styles, color meanings, and
action terminology across every screen. If \'Submit\' is a blue button
on the deal form, it must be a blue button everywhere. Establish a
design system and never deviate.

**5. Error Prevention**

Prevent problems from occurring in the first place. Confirm before
consequential actions.

Lendry application: Validate form fields in real-time as users type ---
don\'t wait for submit to show errors. Show a confirmation modal before
declining a loan. Auto-calculate DSCR to catch data entry errors before
submission. This is especially critical in lending where a wrong number
has real financial consequences.

**6. Recognition Over Recall**

Minimize memory load. Users shouldn\'t have to remember info from one
page to use it on another.

Lendry application: Show deal summary data in the sidebar while the user
fills out document requests. Pre-populate fields with data already
entered. Show recent deals on the dashboard. Users should never have to
memorize a loan number.

**7. Flexibility and Efficiency**

Accelerators allow expert users to work faster. Design for both
beginners and power users.

Lendry application: Keyboard shortcuts for frequent actions. Bulk
actions on the deal table. Saved deal templates for repeat loan types. A
broker submitting their 50th DSCR deal should move much faster than
their first --- your UI should enable that.

**8. Aesthetic and Minimalist Design**

Every extra element competes with every relevant element and diminishes
its visibility. Remove anything that doesn\'t serve a purpose.

Lendry application: The deal detail page shouldn\'t show every possible
data field. Use progressive disclosure --- show the core loan metrics
prominently, and put secondary fields behind an \'Advanced\' toggle.
Generous whitespace signals professionalism in fintech.

**9. Help Users Recognize, Diagnose, and Recover from Errors**

Error messages should identify the problem in plain language and suggest
a solution.

Lendry application: Don\'t show \'Error 422.\' Show \'DSCR is below the
minimum threshold of 1.20. Please review your net operating income
figure.\' In a lending context, a confusing error message can stall a
deal. Make every error message actionable.

**10. Help and Documentation**

Even though it\'s better if the system can be used without
documentation, help content must be available when users need it.

Lendry application: Contextual tooltips on technical fields (hover over
\'Cap Rate\' to see definition). An in-app knowledge base. A
first-time-use walkthrough. A help button on every complex workflow
step. Lenders deal with compliance and technicalities --- they need
reference material fast.

**5. Lendry.AI UI/UX: Dos and Don\'ts**

**Onboarding**

  -------------------------------------------------------------------------------------------- ------------------------------------------------------------------------------------------------
  **✓ DO**                                                                                     **✗ DON\'T**
  Show users immediate value on first login --- a demo deal or pre-loaded sample data.         Don\'t make users complete a 15-field profile before seeing any value.
  Use a step-by-step guided tour for first-time users with clear skip option.                  Don\'t throw users into a blank dashboard with no guidance or empty states.
  Show a progress bar for account setup (\'3 of 5 steps complete\').                           Don\'t require e-signature setup before users can explore the deal pipeline.
  Let lenders import existing deals or borrower data from CSV on first login.                  Don\'t require email verification before the user can access a demo environment.
  Define your \'aha moment\' (e.g., first deal submitted) and optimize every step toward it.   Don\'t assume users know what DSCR, LTV, or NOI means --- define it inline on first encounter.
  -------------------------------------------------------------------------------------------- ------------------------------------------------------------------------------------------------

**Dashboard & Navigation**

  ------------------------------------------------------------------------------------------- ------------------------------------------------------------------------------------------------------------
  **✓ DO**                                                                                    **✗ DON\'T**
  Show the user\'s most critical metric first: active deals in pipeline, total loan volume.   Don\'t put more than 7 items in your main navigation.
  Use sidebar navigation with clear section labels: Deals, Borrowers, Documents, Settings.    Don\'t bury the \'New Deal\' button in a submenu --- it\'s your primary action.
  Maintain active state indicators in navigation so users always know where they are.         Don\'t use ambiguous icons without labels in navigation (hamburger menus are fine on mobile, not desktop).
  Load the dashboard in under 2 seconds --- use skeleton screens while data loads.            Don\'t crowd the dashboard with every possible metric --- prioritize ruthlessly.
  Show recent activity feed so lenders can quickly spot what changed since last login.        Don\'t use the same visual weight for primary, secondary, and tertiary actions.
  ------------------------------------------------------------------------------------------- ------------------------------------------------------------------------------------------------------------

**Forms & Data Entry**

  --------------------------------------------------------------------------------------------- ------------------------------------------------------------------------------------------------
  **✓ DO**                                                                                      **✗ DON\'T**
  Validate fields in real-time as users type, not on submit.                                    Don\'t show all 40 loan fields on one page --- use multi-step forms with progress indicators.
  Auto-save deal drafts every 30 seconds --- lenders can\'t lose data they\'ve entered.         Don\'t use \'Required\' asterisks without explaining them in a legend.
  Group related fields in logical sections: Borrower Info, Property Details, Loan Parameters.   Don\'t allow a form to lose data when the user navigates back or their session expires.
  Use smart defaults and pre-populated fields wherever possible.                                Don\'t use dropdowns for fewer than 5 options --- use radio buttons instead.
  Show inline help text (not tooltips) for technical financial fields like NOI, LTV, DSCR.      Don\'t let form submission fail silently. Always confirm success or explain the error clearly.
  --------------------------------------------------------------------------------------------- ------------------------------------------------------------------------------------------------

**Trust, Security & Transparency**

  ----------------------------------------------------------------------------------------------- -------------------------------------------------------------------------------------------
  **✓ DO**                                                                                        **✗ DON\'T**
  Show confirmation screens before any irreversible action (declining a deal, deleting a file).   Don\'t use dark patterns --- never hide a cancellation button or pre-check consent boxes.
  Display security indicators: SSL lock, \'Bank-level encryption,\' data handling disclosures.    Don\'t show vague error messages when a deal is rejected by AI. Explain the reason.
  Show document status clearly: \'Signed,\' \'Awaiting Signature,\' \'Expired.\'                  Don\'t mix deal statuses without visual differentiation (color coding + labels).
  Log all user actions for compliance --- and make the audit trail accessible in the UI.          Don\'t bury pricing or fee information in the platform.
  Be transparent about AI decisions --- \'AI flagged this deal based on DSCR below 1.20.\'        Don\'t let AI take irreversible actions without human confirmation.
  ----------------------------------------------------------------------------------------------- -------------------------------------------------------------------------------------------

**Visual Design & Typography**

  --------------------------------------------------------------------------------------------------------------------- -----------------------------------------------------------------------------------------------------------------
  **✓ DO**                                                                                                              **✗ DON\'T**
  Use a neutral, professional color palette: navy, white, slate gray as base --- reserve color for status and alerts.   Don\'t use more than 3 font weights in the entire application.
  Establish a clear typographic hierarchy: H1 for page titles, H2 for sections, body for content.                       Don\'t use color alone to convey meaning --- add labels or icons for accessibility.
  Use generous whitespace --- fintech users are processing dense information; don\'t add visual noise.                  Don\'t use pure black (\#000000) or pure white (\#FFFFFF) as primary colors --- use near-black/off-white.
  Maintain minimum 4.5:1 contrast ratio for all body text (WCAG AA standard).                                           Don\'t use decorative fonts in a lending platform --- stick to Inter, DM Sans, or similar neutral sans-serifs.
  Use consistent iconography from a single library (Lucide, Heroicons) throughout.                                      Don\'t use red for anything other than errors and critical alerts --- it creates anxiety in financial contexts.
  --------------------------------------------------------------------------------------------------------------------- -----------------------------------------------------------------------------------------------------------------

**Performance & Responsiveness**

  --------------------------------------------------------------------------------------- ---------------------------------------------------------------------------------------------------------------
  **✓ DO**                                                                                **✗ DON\'T**
  Target sub-2-second page load times for all core screens.                               Don\'t block the entire UI while a document is uploading --- use background uploads with progress indicators.
  Use skeleton loaders instead of spinners for data-heavy pages.                          Don\'t load all deals at once --- use pagination or infinite scroll with clear limits.
  Optimize for desktop-first but ensure all key workflows work on tablet.                 Don\'t let the app go stale --- if a user leaves and returns, refresh data automatically.
  Implement optimistic UI updates --- assume an action succeeds and revert if it fails.   Don\'t rely on full page refreshes for status updates --- use WebSocket or polling.
  Cache frequently accessed data like deal summaries and borrower profiles.               Don\'t ignore mobile --- loan officers check deal status between meetings.
  --------------------------------------------------------------------------------------- ---------------------------------------------------------------------------------------------------------------

**6. Building Stickiness Into Lendry.AI**

Stickiness means users come back, stay longer, and make Lendry part of
their daily workflow. It is engineered, not accidental. These are the
proven mechanics:

**Habit Loop Design (Trigger → Action → Reward)**

-   Trigger: Email or in-app notification --- \'Your deal \[Elm Street
    Office Park\] moved to Underwriting.\'

-   Action: User clicks → lands on deal detail page with clear next step
    visible.

-   Reward: Clean status update, progress toward close, sense of control
    and momentum.

Design every notification to pull users into a specific, high-value
action, not just a generic dashboard.

**Progress & Completion Mechanics**

-   Show deal pipeline stages with visual progress bars: Pre-Screened →
    Docs Received → Underwriting → Approved → Closed.

-   Show completion percentages on deal checklists: \'7 of 10 required
    documents uploaded.\'

-   Celebrate milestones: A subtle success animation when a deal moves
    to Approved.

-   Show portfolio-level metrics to lenders: \'You\'ve processed \$4.2M
    in deals this month.\'

**Personalization**

-   Let lenders customize their dashboard widgets --- which metrics they
    see first.

-   Remember and pre-fill user preferences (loan types, geographic
    markets, preferred terms).

-   Tailor empty states to role: a broker sees \'Submit your first
    deal\' while a lender sees \'Review pending applications.\'

**Workflow Lock-In (Switching Costs)**

-   The more data users put into Lendry (borrower profiles, deal
    history, documents), the more valuable it becomes and the harder it
    is to leave.

-   Integrate with Gmail, Outlook, and DocuSign so Lendry sits inside
    existing workflows --- not outside them.

-   Build team collaboration features: comments on deals, \@mentions,
    shared doc requests. The more people at a firm using Lendry, the
    stickier it becomes.

**Speed as a Retention Tool**

Helixbeat research shows that a 3-second UI rule --- where any core
action is completable in under 3 seconds --- can increase SaaS retention
by 25%. For Lendry, this means: submitting a pre-screener takes under 2
minutes, checking a deal status takes under 10 seconds, uploading a
document takes under 30 seconds.

**7. Most Common B2B SaaS UX Mistakes to Avoid**

+----------------------------------------------------------------------+
| **Source**                                                           |
|                                                                      |
| OneThing Design, B2B SaaS UX Challenges 2026 --- validated across    |
| multiple enterprise fintech platforms.                               |
+----------------------------------------------------------------------+

**Designing for Internal Opinions, Not Users**

The most common B2B SaaS mistake is building what your team thinks users
want instead of what users actually do. Sales requests, leadership
preferences, and edge case pandering create cluttered, confusing
interfaces. Fix: Run user interviews. Watch lenders and brokers use your
app. Design for the 80% use case first.

**Feature Overload**

More features ≠ more value. Too many features reduce clarity and slow
adoption. Every feature you add is a feature users must learn. Fix:
Build fewer features that do their job perfectly. Use progressive
disclosure to hide complexity until it\'s needed.

**Unclear Onboarding**

If a new lender can\'t understand the value of Lendry in the first 5
minutes, they will not come back. Fix: Define your \'aha moment\' ---
the first moment a user feels Lendry genuinely helps them --- and make
every onboarding step move toward it.

**Ignoring Empty States**

A blank dashboard with no guidance creates anxiety and abandonment. Fix:
Every empty state should explain what belongs there and provide a clear
CTA: \'No deals yet. Submit your first deal →\'

**Functionality Over Usability**

Many B2B tools are built by engineers focused on back-end capabilities,
leaving the front end as an afterthought. This is precisely why
enterprise software has a reputation for being painful to use --- and
why Lendry has an opportunity to be the category leader if you get this
right.

**Poor Error Handling**

In lending, errors matter. A document upload fails, a deal submission is
rejected, a signature expires. If your error messages are vague (or
worse, invisible), users lose trust in the entire platform. Fix: Every
error message must name the problem and suggest the solution.

**The \$900 Million Warning**

In 2020, Citibank employees made a \$900 million wire transfer error
because of a confusing interface in their Flexcube software. Poor UI
design in lending isn\'t just a UX problem --- it is a business risk.
Design confirmation flows carefully.

**8. Pre-Launch UX Checklist for Lendry.AI**

Run through this checklist before shipping any major screen or workflow:

  ------- -------------------------------------------------------------------------------------------------------
  **✓**   **Checklist Item**
  ☐       Every screen has a clear primary action --- one button dominates visually.
  ☐       All error states are designed with plain-language messages and recovery suggestions.
  ☐       Empty states are designed for every list, table, and dashboard widget.
  ☐       Multi-step forms have progress indicators and allow users to go back without losing data.
  ☐       All form fields validate in real-time, not on submit.
  ☐       Deal status changes trigger user notifications with a direct link to the relevant deal.
  ☐       The dashboard loads in under 2 seconds on a standard connection.
  ☐       Color is never the only indicator of status --- labels or icons accompany all color-coded states.
  ☐       Navigation items are labeled (no icon-only nav without tooltips).
  ☐       The platform has been tested with 5 real users before launch.
  ☐       All financial terms have inline definitions or tooltips on first use.
  ☐       The primary CTA (\'Submit Deal,\' \'Upload Document\') is visible above the fold on every key screen.
  ☐       AI-driven decisions include a plain-language explanation of the reasoning.
  ☐       Role-based access is tested --- brokers cannot see lender-only data, and vice versa.
  ☐       The app works functionally on tablet and is readable on mobile.
  ☐       All text meets WCAG AA contrast ratio (4.5:1 minimum).
  ☐       Users can complete the core workflow (submit a deal) without reading any documentation.
  ☐       The onboarding flow reaches the \'aha moment\' within 5 minutes for a new user.
  ------- -------------------------------------------------------------------------------------------------------

**9. Recommended Tools for Designing Lendry.AI**

  ---------------------------------------- ---------------------- --------------------------------------------------------------------------------------------------------
  **Tool**                                 **Category**           **Use for Lendry**
  **Figma**                                Design & Prototyping   Wireframes, mockups, and clickable prototypes before you build anything in Replit.
  **Tailwind CSS**                         Design System          Your component library in Replit. Use a consistent theme file for all colors, spacing, and typography.
  **Shadcn/UI**                            Component Library      Pre-built accessible components (tables, modals, forms) that match Tailwind. Saves weeks.
  **Hotjar / Mouseflow**                   Analytics & Heatmaps   Track where real users click, scroll, and drop off after launch.
  **Loom**                                 User Testing           Record yourself doing walkthroughs and share with 5 real lenders for feedback.
  **Lucide Icons**                         Iconography            Consistent, clean icon set already available in your Replit stack.
  **Nielsen Norman Group (nngroup.com)**   Research               Free articles on every UX topic. The most trusted source in the field.
  **Maze / Lookback**                      Usability Testing      Remote user testing tools --- run tests with actual lenders before shipping.
  ---------------------------------------- ---------------------- --------------------------------------------------------------------------------------------------------

**10. The One Rule That Overrides Everything Else**

+----------------------------------------------------------------------+
| **Design for the user\'s job, not your feature list.**               |
|                                                                      |
| A lender using Lendry isn\'t thinking about uploading a document.    |
| They\'re thinking about closing a deal. A broker isn\'t thinking     |
| about filling out a form. They\'re thinking about getting their      |
| client funded. Every design decision you make should be evaluated    |
| through this lens: does this make it faster, clearer, and more       |
| confident for the user to get their job done? That is the entirety   |
| of good UX.                                                          |
+----------------------------------------------------------------------+

*Sources: Nielsen Norman Group (nngroup.com) · Eleken.co · Procreator
Design · OneThing Design · Webstacks · DashDevs · Helixbeat · ProfitWell
· Stanford Web Credibility Research · Zendesk.*
