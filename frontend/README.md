# Velora Circle

Build a premium, production-quality frontend web application called "Velora Circle".

Velora Circle is a privacy-first collaboration platform combining:

- Private 1-to-1 messaging

- Private group conversations ("Circles")

- Video/audio meetings

- Scheduled meetings

- Secure file sharing

- Team/workspace collaboration

The core differentiating feature is PRIVACY:

Normal members must NOT see:

- Total number of members in a Circle

- Full member directory

- Online member count

- Who joined or left

- Any unnecessary participant statistics

Only Owners/Admins with the appropriate permissions can see/manage member information.

IMPORTANT:

This is a frontend UI project. Build the interface with realistic mock data and reusable components. Do not build fake backend functionality. All interactions should feel functional through frontend state, modals, dropdowns, navigation, and sample data.

==================================================

DESIGN DIRECTION

==================================================

Make the product feel like a premium combination of:

- Linear

- Slack

- Discord

- Notion

- modern private banking software

Do NOT make it look like a basic Bootstrap dashboard or generic SaaS template.

Visual style:

- Premium

- Minimal

- Sophisticated

- Privacy-focused

- Modern

- Slightly futuristic

- Clean

- Professional enough for enterprise users

Use:

- Deep navy / charcoal foundation

- Soft white text

- Subtle blue accents

- Very limited violet/cyan accents

- Glassmorphism only where appropriate

- Soft borders

- Large but controlled border radius

- Subtle shadows

- Elegant gradients

- Smooth micro-interactions

Avoid:

- Excessive gradients

- Excessive glowing effects

- Too many colors

- Huge cards

- Clutter

- Cartoonish illustrations

- Excessive avatars

- Cheap-looking UI

Typography:

Use Inter, Manrope, or Satoshi.

Strong hierarchy.

Large clean headings.

Comfortable spacing.

Icons:

Use Lucide icons or another consistent SVG icon system.

DO NOT use emoji as UI icons.

Every icon should be an SVG/icon component.

==================================================

APPLICATION STRUCTURE

==================================================

Create the following main application layout:

LEFT SIDEBAR

MAIN CONTENT

OPTIONAL RIGHT INFORMATION PANEL

Desktop-first, but fully responsive.

Sidebar:

Top:

VELORA CIRCLE logo

Navigation:

Home

Messages

Circles

Meetings

Saved

Files

Divider

Workspace

- My Workspace

- Private Spaces

- Shared Projects

Bottom:

Settings

Help & Support

User profile

The sidebar should be collapsible.

Use elegant active-state indicators.

==================================================

1. LOGIN / WELCOME SCREEN

==================================================

Create a premium authentication screen.

Left side:

Large brand statement:

"Private conversations.

Focused collaboration."

Supporting text:

"Connect, meet, and collaborate without unnecessary visibility."

Right side:

Premium login card.

Fields:

Email

Password

Buttons:

Continue

Continue with Google

Links:

Forgot password?

Create account

Include subtle background visual elements such as:

- abstract connected nodes

- blurred glass shapes

- subtle gradient mesh

- privacy/security visual language

Do not make the background distracting.

==================================================

2. HOME DASHBOARD

==================================================

Create a premium dashboard.

Top:

"Good morning, Ram"

Subtitle:

"Your private workspace, all in one place."

Top-right:

Search

Notifications

Profile avatar

Main actions:

[ + Start Meeting ]

[ + New Message ]

Upcoming Meetings section:

Meeting cards showing:

Meeting title

Date

Time

Meeting status

Join button

Example:

Product Strategy

Today · 6:30 PM

Private Meeting

[ Join Meeting ]

Recent Conversations:

Show conversation previews.

Example:

Design Circle

"Can we finalize the UI flow?"

12 min ago

Do NOT show member counts.

Private Spaces section:

Cards:

Alpha Circle

Core Team

Mentorship Hub

Project Nova

Each card should show:

Name

Privacy status

Last activity

Instead of:

"125 members"

show:

"Private Circle"

or

"Restricted Access"

==================================================

3. MESSAGES PAGE

==================================================

Create a modern 3-column messaging interface.

LEFT:

Conversation list

Search conversations.

Tabs:

All

Unread

Pinned

Conversation items:

Avatar

Name

Last message

Timestamp

Unread indicator

MIDDLE:

Conversation window

Header:

Name

"Private conversation"

Actions:

Search

Call

Video

More

Message area:

Modern message bubbles.

Support:

Text

Images

Files

Voice message UI

Reactions

Replies

Bottom composer:

+

Attach

Message input

Emoji icon

Voice icon

Send button

Do not show unnecessary participant information.

==================================================

4. PRIVATE CIRCLE PAGE

==================================================

This is the most important page.

Header:

← Back

Alpha Circle

Private space · Member directory hidden

Right side:

Search

Meeting

More

IMPORTANT:

Never display:

"125 members"

"24 online"

"Members"

for normal users.

Instead display:

"Private Circle"

or:

"Member visibility restricted"

Message interface below.

At the top optionally show:

Pinned message

Conversation.

Composer.

Right-side panel can show:

About this Circle

Private space

Messages are visible only to authorized participants.

Permissions

Member directory hidden

Member count hidden

Invite restricted

For admins, provide an "Manage Circle" button.

==================================================

5. CIRCLE CREATION

==================================================

Create a beautiful modal:

"Create a Private Circle"

Fields:

Circle name

Description

Privacy level

Privacy options:

Private

Restricted

Invite only

Toggle settings:

Hide member count

Hide member directory

Hide online status

Disable join/leave notifications

Restrict invitations

Primary button:

Create Circle

==================================================

6. MEETINGS PAGE

==================================================

Create a premium meeting dashboard.

Header:

"Meetings"

Buttons:

Start Instant Meeting

Schedule Meeting

Sections:

Upcoming

Today

Past

Meeting cards:

Meeting name

Date

Time

Host

Privacy badge

Join button

Example:

Product Strategy

Today · 6:30 PM

Private Meeting

[ Join ]

==================================================

7. MEETING ROOM

==================================================

Create a premium video meeting interface.

Full-screen dark interface.

Main area:

Large participant/video area.

Use realistic placeholder video panels.

Bottom floating control bar:

Mute

Camera

Screen Share

Raise Hand

Reactions

Chat

Participants

More

Leave

Do NOT show:

"12 participants"

to normal users.

Instead:

"Private meeting"

For authorized hosts/admins, participants can be opened through a panel.

Right-side meeting chat panel.

Top:

Meeting title

Privacy indicator

Recording status if active

Include a subtle security indicator:

🔒 Secure meeting

But use an SVG lock icon rather than emoji.

==================================================

8. SCHEDULE MEETING MODAL

==================================================

Fields:

Meeting title

Date

Time

Duration

Circle / participants

Description

Privacy options:

Private meeting

Invite only

Buttons:

Cancel

Schedule Meeting

After scheduling show confirmation state.

==================================================

9. SAVED PAGE

==================================================

Create:

Saved Messages

Saved Files

Saved Links

Clean card/list interface.

==================================================

10. FILES PAGE

==================================================

Create premium file management UI.

Sections:

Recent

Shared with me

My files

File cards/list rows:

File icon

File name

Type

Date

Size

More

Use SVG file-type icons.

==================================================

11. PROFILE

==================================================

Create profile dropdown.

Show:

Profile photo

Name

Status

Options:

Profile

Privacy

Notifications

Appearance

Security

Devices

Sign out

==================================================

12. SETTINGS

==================================================

Create a sophisticated settings page.

Sidebar:

Account

Privacy

Notifications

Security

Appearance

Meetings

Circles

Devices

Privacy page should be especially polished.

Settings:

Who can see my online status?

Who can invite me?

Show read receipts

Allow message forwarding

Allow file downloads

Circle privacy defaults:

Hide member count

Hide member directory

Hide online members

Restrict invitations

==================================================

13. ADMIN / OWNER VIEW

==================================================

Create a separate management interface accessible only to mock Admin/Owner roles.

Dashboard:

Circle Overview

Stats can be shown ONLY here.

Example:

Active conversations

Members

Pending invites

Reports

Member management:

Search members

Role

Status

Joined date

Actions

Roles:

Owner

Admin

Moderator

Member

Guest

IMPORTANT:

These statistics and member lists must NEVER appear in the normal member UI.

==================================================

14. NOTIFICATION SYSTEM

==================================================

Create a polished notification dropdown.

Examples:

New message

Meeting starting soon

You were invited to a Circle

File shared with you

Meeting scheduled

Use unread indicators.

==================================================

15. SEARCH

==================================================

Create global search.

Search categories:

Messages

Circles

Meetings

Files

Search modal should feel like Linear/Spotlight.

Keyboard shortcut:

⌘ K / Ctrl K

==================================================

16. EMPTY STATES

==================================================

Design beautiful empty states.

Examples:

No conversations yet

"Your private conversations will appear here."

[ Start a conversation ]

No upcoming meetings

"Your schedule is clear."

[ Schedule a meeting ]

No saved items

"Save important messages, files, and links here."

==================================================

17. RESPONSIVE DESIGN

==================================================

Desktop:

3-column layouts where appropriate.

Tablet:

Collapse secondary panels.

Mobile:

Bottom navigation.

Mobile navigation:

Home

Messages

Circles

Meetings

Profile

Chat should become full-screen.

Meeting controls should be optimized for touch.

Sidebar becomes a drawer.

==================================================

18. MICRO-INTERACTIONS

==================================================

Add subtle animations:

- Sidebar transitions

- Page transitions

- Button hover

- Message appearance

- Modal opening

- Dropdown animation

- Toast notifications

- Active navigation indicator

- Skeleton loading states

Keep animations fast and sophisticated.

No excessive bouncing animations.

==================================================

19. COMPONENT SYSTEM

==================================================

Build reusable components:

Button

IconButton

Avatar

Badge

Modal

Dropdown

Tooltip

Toast

Card

Input

Textarea

Search

Sidebar

Navbar

MessageBubble

MessageComposer

ConversationItem

CircleCard

MeetingCard

MeetingControls

FileCard

SettingsPanel

PrivacyToggle

UserMenu

Use reusable components instead of duplicating UI.

==================================================

20. ACCESSIBILITY

==================================================

Include:

- Keyboard navigation

- Focus states

- ARIA labels

- Proper contrast

- Tooltips for unfamiliar icons

- Accessible modals

- Screen-reader-friendly buttons

==================================================

21. IMPORTANT PRIVACY UX RULE

==================================================

The privacy model must be visually obvious but never feel broken.

For normal members:

DO NOT show:

Member count

Online count

Full member list

"X people in this group"

Instead use subtle language:

"Private Circle"

"Restricted member visibility"

"Member directory hidden"

The application should feel intentionally private.

For Admin/Owner:

Allow access to member management and statistics through a dedicated management panel.

==================================================

22. PREMIUM DETAILS

==================================================

Add small details that make the application feel expensive:

- Thin 1px borders

- Soft background gradients

- Frosted glass modal surfaces

- Subtle hover elevation

- Smooth icon transitions

- Consistent 8px spacing system

- Rounded 12–18px cards

- Clean separators

- Carefully designed empty states

- Elegant skeleton loaders

- Toast notifications

- Keyboard shortcuts

- Command palette

- Persistent theme preference

Use dark mode as the primary experience.

Also provide Light Mode.

==================================================

23. COLOR SYSTEM

==================================================

Primary background:

Deep navy / near-black.

Surface:

Slightly lighter navy.

Primary accent:

Electric blue.

Secondary accent:

Subtle violet/cyan.

Destructive:

Muted red.

Success:

Muted green.

Do not use bright colors everywhere.

The interface should look premium even when there is very little content.

==================================================

24. BRANDING

==================================================

Brand:

VELORA CIRCLE

Tagline:

"Private conversations. Focused collaboration."

Alternative short tagline:

"Connect privately. Collaborate confidently."

Use a minimal V-shaped SVG mark.

Do not use generic chat bubble branding.

==================================================

25. FINAL QUALITY REQUIREMENT

==================================================

The final result must look like a real startup product ready for a premium SaaS launch.

It should NOT look like:

- A student project

- A template

- A generic admin dashboard

- A clone of WhatsApp

- A clone of Discord

- A basic CRUD application

The design should communicate:

PRIVACY

TRUST

PREMIUM

COLLABORATION

FOCUS

SECURITY

Prioritize visual hierarchy, whitespace, typography, interaction quality, and consistency.

Use realistic sample content so every page looks populated and production-ready.

==================================================

26. CROSS-PLATFORM RESPONSIVE EXPERIENCE

==================================================

This application must be fully responsive and optimized for:

- Windows laptops

- MacBook

- Desktop monitors

- iPhone

- Android phones

- iPad

- Android tablets

This is NOT a desktop website that simply shrinks on mobile.

The interface must adapt its layout, navigation, spacing,

controls, typography, and interactions based on screen size.

==================================================

DESKTOP EXPERIENCE — LAPTOP / MACBOOK / DESKTOP

==================================================

For screens >= 1024px:

Use the full application layout:

┌──────────────┬───────────────────────────────┬──────────────┐

│              │                               │              │

│   SIDEBAR    │        MAIN CONTENT           │   OPTIONAL   │

│              │                               │   PANEL      │

│              │                               │              │

└──────────────┴───────────────────────────────┴──────────────┘

Sidebar:

240–280px

Main content:

Flexible

Right panel:

280–360px when required

Allow sidebar collapse.

Use keyboard shortcuts.

Support:

Ctrl + K

Cmd + K

for global search.

Desktop should make maximum use of available screen

space without becoming visually crowded.

==================================================

TABLET EXPERIENCE — IPAD / ANDROID TABLET

==================================================

For screens between approximately 768px and 1023px:

- Sidebar becomes collapsible

- Main content remains primary

- Right panels become drawers

- Chat remains comfortable for touch

- Buttons have larger touch targets

- Meeting controls remain easily accessible

- Avoid tiny desktop-style controls

For iPad landscape:

Allow a two-panel experience when space permits.

For iPad portrait:

Use a single primary content panel with drawers.

==================================================

MOBILE EXPERIENCE — IPHONE / ANDROID

==================================================

For screens below approximately 768px:

DO NOT simply scale down the desktop interface.

Create a dedicated mobile layout.

Navigation becomes a bottom navigation bar:

┌─────────────────────────────────────────┐

│                                         │

│              MAIN CONTENT               │

│                                         │

│                                         │

├─────────────────────────────────────────┤

│  Home   Messages   Circles   Meetings  │

│                              Profile    │

└─────────────────────────────────────────┘

Bottom navigation:

Home

Messages

Circles

Meetings

Profile

Use SVG icons with labels.

The bottom navigation should:

- Stay accessible

- Respect iPhone safe-area insets

- Work correctly with Android navigation areas

- Never cover message input or important content

==================================================

MOBILE CHAT EXPERIENCE

==================================================

Chat becomes full-screen.

Header:

← Back

Avatar

Conversation name

Privacy status

Search

More

Message area:

Full width.

Composer stays near the bottom:

┌─────────────────────────────────────────┐

│ +  Message...              🎤    ➤      │

└─────────────────────────────────────────┘

Use actual SVG icons instead of emoji.

The keyboard must not cover the message composer.

Use mobile-safe viewport behavior.

Support:

- Text

- Images

- Files

- Voice messages

- Reactions

- Replies

Long-press a message should open:

Reply

React

Copy

Save

Forward

Delete

==================================================

MOBILE PRIVATE CIRCLE

==================================================

Header:

←

Alpha Circle

Private Circle

Member visibility restricted

Actions:

Search

Meeting

More

Do NOT show:

125 members

24 online

Member list

Normal members should only see:

"Private Circle"

or:

"Member visibility restricted"

==================================================

MOBILE MEETING EXPERIENCE

==================================================

Meeting interface should be optimized specifically

for smartphones.

Use full-screen video.

Controls should be positioned in an easily reachable

bottom area.

Controls:

Mute

Camera

Speaker

Share

Chat

Raise Hand

More

Leave

Do not create tiny desktop-style buttons.

When Chat is opened:

Use a bottom sheet or full-screen panel.

When Participants is opened:

Use a bottom sheet.

Normal members should NOT see participant counts.

==================================================

MOBILE MEETING JOIN FLOW

==================================================

Create a simple mobile join screen:

          Velora Circle

       Product Strategy

       Private Meeting

       Camera preview

       [ Join Meeting ]

       Microphone

       Camera

Keep the experience extremely simple.

==================================================

MOBILE SIDEBAR / DRAWER

==================================================

When the user taps the profile/menu button,

open a smooth full-height drawer.

Options:

Home

Messages

Circles

Meetings

Saved

Files

────────────

Workspace

Settings

Privacy

Security

Help

Profile at bottom.

==================================================

RESPONSIVE DESIGN RULES

==================================================

Never allow:

- Horizontal scrolling

- Text clipping

- Buttons overflowing

- Cards extending outside viewport

- Fixed desktop widths on mobile

- Tiny unreadable text

- Overlapping navigation

- Keyboard covering inputs

- Meeting controls being inaccessible

Use responsive CSS/grid/flex layouts.

Use CSS breakpoints intelligently.

All components must adapt naturally.

==================================================

TOUCH EXPERIENCE

==================================================

Mobile and tablet controls must have comfortable

touch targets.

Minimum target size:

44px × 44px where practical.

Add:

- Swipe gestures where useful

- Long press actions

- Bottom sheets

- Touch-friendly menus

- Pull-to-refresh style interaction where appropriate

Do not rely exclusively on hover.

Everything available through hover on desktop must

have an equivalent interaction on mobile.

==================================================

IPHONE-SPECIFIC

==================================================

Optimize for modern iPhones.

Support:

- Safe-area insets

- Dynamic viewport height

- Notch / Dynamic Island spacing

- Mobile keyboard

- Portrait

- Landscape

Do not position important UI elements directly against

the screen edges.

==================================================

ANDROID-SPECIFIC

==================================================

Optimize for common Android screen sizes.

Support:

- Different aspect ratios

- Navigation bars

- Android keyboard

- Gesture navigation

- Portrait

- Landscape

Avoid fixed pixel heights wherever possible.

==================================================

PWA / APP-LIKE EXPERIENCE

==================================================

Structure the frontend so it can later be deployed

as a Progressive Web App.

Include:

- Mobile-friendly viewport

- App-like navigation

- Installable architecture

- Offline-friendly shell where possible

- Splash/loading experience

- Proper app icons

- Responsive layouts

The application should feel like a native mobile app

when opened on a phone.

==================================================

DESKTOP + MOBILE DESIGN PRINCIPLE

==================================================

Desktop should feel like:

"Professional workspace"

Mobile should feel like:

"Private communication app"

Both must clearly feel like the same Velora Circle product.

Do not create two completely different visual identities.

Maintain the same:

- Typography

- Colors

- Icons

- Brand

- Components

- Privacy language

- Interaction principles

across every device.

                 VELORA CIRCLE

                       │

          ┌────────────┴────────────┐

          │                         │

       Desktop                   Mobile

          │                         │

   Windows / Mac              iPhone / Android

          │                         │

          └────────────┬────────────┘

                       │

                Same backend/API

                       │

                 Same account

                       │

                Same conversations

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
