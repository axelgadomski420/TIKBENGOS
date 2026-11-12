-- Elif community demo seed data
-- Import with:
--   mysql -u root Elif < backend/user_demo_seed.sql
--   mysql -u root Elif < backend/community_demo_seed.sql
--

START
TRANSACTION;

SET FOREIGN_KEY_CHECKS
= 0;

DELETE FROM message WHERE id BETWEEN 8001 AND 8020;
DELETE FROM message_attachment WHERE id BETWEEN 9001 AND 9020;
DELETE FROM community_follow WHERE id BETWEEN 9101 AND 9120;
DELETE FROM conversation WHERE id BETWEEN 7001 AND 7006;
DELETE FROM community_vote WHERE id BETWEEN 6001 AND 6030;
DELETE FROM community_comment WHERE id BETWEEN 5001 AND 5030;
DELETE FROM community_post WHERE id BETWEEN 4001 AND 4020;
DELETE FROM flair WHERE id BETWEEN 3501 AND 3520;
DELETE FROM community_rule WHERE id BETWEEN 3001 AND 3020;
DELETE FROM community_member WHERE community_id BETWEEN 2001 AND 2010 OR user_id BETWEEN 1001 AND 1017;
DELETE FROM community WHERE id BETWEEN 2001 AND 2010;

DELETE FROM message WHERE id BETWEEN 70000 AND 73999;
DELETE FROM conversation WHERE id BETWEEN 60000 AND 60119;
DELETE FROM community_vote WHERE id BETWEEN 50000 AND 53999;
DELETE FROM community_comment WHERE id BETWEEN 30000 AND 32999;
DELETE FROM community_post WHERE id BETWEEN 20000 AND 20999;
DELETE FROM community_follow WHERE id BETWEEN 92000 AND 92999;
DELETE FROM community_member WHERE id BETWEEN 15000 AND 16020;
DELETE FROM flair WHERE id BETWEEN 12000 AND 12240;
DELETE FROM community_rule WHERE id BETWEEN 11000 AND 11180;
DELETE FROM community WHERE id BETWEEN 2101 AND 2160;

SET FOREIGN_KEY_CHECKS
= 1;

INSERT INTO community
  (
  id, name, slug, description, type, created_by, banner_url, icon_url, member_count, created_at
  )
VALUES
  (2001, 'Golden Retriever Club', 'golden-retriever-club', 'A friendly place for golden retriever owners to share daily routines, food tips, training wins, and health questions in one supportive space.', 'PUBLIC', 1005, 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=300&q=80', 5, '2026-03-05 09:00:00'),
  (2002, 'Cat Care Circle', 'cat-care-circle', 'Cat parents compare routines, litter solutions, enrichment ideas, and behavior advice while keeping answers calm, practical, and kind.', 'PUBLIC', 1006, 'https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=300&q=80', 5, '2026-03-06 10:00:00'),
  (2003, 'First Time Adopters', 'first-time-adopters', 'Questions for people preparing to adopt their first pet, from supplies and settling in to the first vet visit and early training habits.', 'PUBLIC', 1003, 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=300&q=80', 5, '2026-03-07 11:00:00'),
  (2004, 'Rescue Foster Network', 'rescue-foster-network', 'A private coordination hub for foster families and volunteers sharing placement updates, urgent needs, and handoff logistics.', 'PRIVATE', 1002, 'https://images.unsplash.com/photo-1535930749574-1399327ce78f?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=300&q=80', 3, '2026-03-08 12:00:00'),
  (2005, 'Small Breed Training Lab', 'small-breed-training-lab', 'Toy and small breed owners compare training structure, confidence games, barking prevention, and apartment-safe enrichment.', 'PUBLIC', 1007, 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?auto=format&fit=crop&w=300&q=80', 5, '2026-03-09 09:20:00'),
  (2006, 'Senior Pets Wellness', 'senior-pets-wellness', 'Caregivers of aging dogs and cats discuss mobility, appetite, comfort routines, and practical quality-of-life tracking.', 'PUBLIC', 1008, 'https://images.unsplash.com/photo-1546975490-e8b92a360b24?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=300&q=80', 4, '2026-03-09 15:10:00'),
  (2007, 'Bird and Exotic Care', 'bird-and-exotic-care', 'Parrot, rabbit, and exotic pet owners share habitat setup, feeding structure, enrichment safety, and vet prep notes.', 'PUBLIC', 1004, 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=300&q=80', 4, '2026-03-10 08:40:00'),
  (2008, 'Adoption Coordinators Private', 'adoption-coordinators-private', 'Private operational space for approved coordinators aligning handoff slots, paperwork checks, and emergency backup plans.', 'PRIVATE', 1002, 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=300&q=80', 3, '2026-03-10 13:30:00');

INSERT INTO community_member
  (
  id, community_id, user_id, role, joined_at
  )
VALUES
  (2501, 2001, 1005, 'CREATOR', '2026-03-05 09:00:00'),
  (2502, 2001, 1003, 'MODERATOR', '2026-03-05 10:00:00'),
  (2503, 2001, 1006, 'MEMBER', '2026-03-05 10:30:00'),
  (2504, 2001, 1007, 'MEMBER', '2026-03-05 11:00:00'),
  (2505, 2001, 1009, 'MEMBER', '2026-03-05 11:15:00'),
  (2506, 2002, 1006, 'CREATOR', '2026-03-06 10:00:00'),
  (2507, 2002, 1003, 'MODERATOR', '2026-03-06 10:15:00'),
  (2508, 2002, 1005, 'MEMBER', '2026-03-06 11:00:00'),
  (2509, 2002, 1008, 'MEMBER', '2026-03-06 11:20:00'),
  (2517, 2002, 1013, 'MEMBER', '2026-03-06 12:10:00'),
  (2510, 2003, 1003, 'CREATOR', '2026-03-07 11:00:00'),
  (2511, 2003, 1004, 'MODERATOR', '2026-03-07 11:20:00'),
  (2512, 2003, 1007, 'MEMBER', '2026-03-07 11:40:00'),
  (2513, 2003, 1010, 'MEMBER', '2026-03-07 12:00:00'),
  (2518, 2003, 1011, 'MEMBER', '2026-03-07 12:20:00'),
  (2514, 2004, 1002, 'CREATOR', '2026-03-08 12:00:00'),
  (2515, 2004, 1004, 'MODERATOR', '2026-03-08 12:10:00'),
  (2516, 2004, 1009, 'MEMBER', '2026-03-08 12:20:00'),
  (2519, 2005, 1007, 'CREATOR', '2026-03-09 09:20:00'),
  (2520, 2005, 1003, 'MODERATOR', '2026-03-09 09:45:00'),
  (2521, 2005, 1011, 'MEMBER', '2026-03-09 10:10:00'),
  (2522, 2005, 1005, 'MEMBER', '2026-03-09 10:20:00'),
  (2523, 2005, 1012, 'MEMBER', '2026-03-09 10:40:00'),
  (2524, 2006, 1008, 'CREATOR', '2026-03-09 15:10:00'),
  (2525, 2006, 1003, 'MODERATOR', '2026-03-09 15:20:00'),
  (2526, 2006, 1006, 'MEMBER', '2026-03-09 15:40:00'),
  (2527, 2006, 1013, 'MEMBER', '2026-03-09 16:05:00'),
  (2528, 2007, 1004, 'CREATOR', '2026-03-10 08:40:00'),
  (2529, 2007, 1003, 'MODERATOR', '2026-03-10 09:10:00'),
  (2530, 2007, 1014, 'MEMBER', '2026-03-10 09:40:00'),
  (2531, 2007, 1009, 'MEMBER', '2026-03-10 10:00:00'),
  (2532, 2008, 1002, 'CREATOR', '2026-03-10 13:30:00'),
  (2533, 2008, 1004, 'MODERATOR', '2026-03-10 13:45:00'),
  (2534, 2008, 1015, 'MEMBER', '2026-03-10 14:10:00');

INSERT INTO community_rule
  (
  id, community_id, title, description, rule_order
  )
VALUES
  (3001, 2001, 'Be specific with health questions', 'Include age, food, recent symptoms, and what changed recently so replies can be more useful.', 1),
  (3002, 2001, 'Share routines, not judgment', 'Different families manage training and enrichment differently. Keep advice practical and respectful.', 2),
  (3003, 2002, 'No unsafe home remedies', 'When a cat may need medical attention, say so clearly and avoid risky DIY treatment suggestions.', 1),
  (3004, 2002, 'Indoor enrichment first', 'Posts about behavior should include scratching, climbing, and play context when possible.', 2),
  (3007, 2002, 'One variable at a time', 'When troubleshooting litter or behavior shifts, change one variable and observe before changing another.', 3),
  (3005, 2003, 'There are no silly beginner questions', 'This community is specifically for first-time adopters. Keep replies welcoming and clear.', 1),
  (3008, 2003, 'Include adoption context', 'Mention pet age, adoption source, and first-week routine when asking for advice.', 2),
  (3006, 2004, 'Protect foster privacy', 'Do not share adopter contact details, intake records, or exact addresses in public screenshots.', 1),
  (3009, 2004, 'Urgent threads need timelines', 'For urgent requests include pickup windows, medication notes, and transport constraints.', 2),
  (3010, 2005, 'Reward calm behavior', 'Training advice should prioritize confidence and consistency over punishment.', 1),
  (3011, 2005, 'Apartment-safe guidance only', 'Keep recommendations realistic for small indoor spaces and close neighbors.', 2),
  (3012, 2006, 'Comfort first', 'Senior pet posts should prioritize comfort, hydration, and predictable routines.', 1),
  (3013, 2006, 'Track symptoms clearly', 'Share appetite, mobility, and sleep changes with rough timelines.', 2),
  (3014, 2007, 'Species-specific advice', 'Mention species clearly and avoid cross-species assumptions in care responses.', 1),
  (3015, 2007, 'Habitat safety matters', 'Include enclosure setup details when asking behavior or health questions.', 2),
  (3016, 2008, 'Coordinator notes stay private', 'Operational handoff details should remain inside approved coordinator threads.', 1);

INSERT INTO flair
  (
  id, community_id, name, color, text_color
  )
VALUES
  (3501, 2001, 'Health', '#F97316', '#FFFFFF'),
  (3502, 2001, 'Training', '#0F766E', '#FFFFFF'),
  (3503, 2001, 'Food', '#2563EB', '#FFFFFF'),
  (3516, 2001, 'Grooming', '#7C3AED', '#FFFFFF'),
  (3504, 2002, 'Behavior', '#7C3AED', '#FFFFFF'),
  (3505, 2002, 'Litter', '#DC2626', '#FFFFFF'),
  (3517, 2002, 'Nutrition', '#0891B2', '#FFFFFF'),
  (3506, 2003, 'Adoption Prep', '#D97706', '#FFFFFF'),
  (3507, 2003, 'First Week', '#059669', '#FFFFFF'),
  (3508, 2004, 'Urgent', '#B91C1C', '#FFFFFF'),
  (3509, 2005, 'Puppy Basics', '#0EA5E9', '#FFFFFF'),
  (3510, 2005, 'Barking', '#F59E0B', '#FFFFFF'),
  (3511, 2006, 'Mobility', '#6D28D9', '#FFFFFF'),
  (3512, 2006, 'Appetite', '#16A34A', '#FFFFFF'),
  (3513, 2007, 'Habitat', '#0284C7', '#FFFFFF'),
  (3514, 2007, 'Feeding', '#EA580C', '#FFFFFF'),
  (3515, 2007, 'Behavior', '#7C3AED', '#FFFFFF'),
  (3518, 2008, 'Ops', '#334155', '#FFFFFF');

INSERT INTO community_post
  (
  id, community_id, user_id, title, content, image_url, type, flair_id, vote_score, view_count, created_at, updated_at, deleted_at
  )
VALUES
  (4001, 2001, 1005, 'What food schedule works best for an 8 month old golden?', 'Our puppy acts hungry all the time and I am trying to balance training treats with regular meals. I would love to hear what feeding schedule worked for your golden around this age and when you switched portions.', NULL, 'QUESTION', 3503, 9, 44, '2026-03-15 09:00:00', '2026-03-15 09:00:00', NULL),
  (4002, 2001, 1003, 'Loose leash practice that finally started working for my dog', 'The biggest change for us was shortening sessions and rewarding every calm check-in for one week straight. Once the pattern clicked, walks became much less frustrating for both of us.', NULL, 'DISCUSSION', 3502, 6, 31, '2026-03-15 13:30:00', '2026-03-15 13:30:00', NULL),
  (4003, 2002, 1006, 'My cat suddenly hates the new litter box setup', 'I changed the litter box location to a busier hallway and now my cat is hesitating and scratching outside the box instead. If anyone has transition tips, I would appreciate them before I move everything again.', NULL, 'QUESTION', 3505, 8, 27, '2026-03-16 08:15:00', '2026-03-16 08:15:00', NULL),
  (4004, 2002, 1008, 'Window perch plus puzzle feeder reduced 5am zoomies', 'Sharing this because the combination of morning play, a puzzle feeder, and a sunny perch made a bigger difference than any one thing alone. It might help someone dealing with restless indoor cats.', NULL, 'DISCUSSION', 3504, 5, 19, '2026-03-16 12:20:00', '2026-03-16 12:20:00', NULL),
  (4005, 2003, 1003, 'Checklist for the first 48 hours after adoption', 'I keep seeing the same early panic moments, so here is the starter checklist I give to first-time adopters: quiet room, fresh water, simple feeding plan, emergency numbers, and realistic expectations for decompression.', NULL, 'DISCUSSION', 3506, 12, 53, '2026-03-14 10:00:00', '2026-03-14 10:00:00', NULL),
  (4006, 2003, 1010, 'How soon should I book the first vet visit after adoption?', 'We are picking up our adopted kitten this weekend and I am unsure whether to schedule the first vet visit immediately or wait a few days for her to settle in. I want to do the right thing without creating extra stress.', NULL, 'QUESTION', 3507, 7, 22, '2026-03-17 09:40:00', '2026-03-17 09:40:00', NULL),
  (4007, 2004, 1004, 'Need weekend foster coverage for a medium energy dog', 'One of our regular foster families has an emergency this weekend. If you can cover Saturday to Monday, please comment with timing and whether you can handle medication reminders.', NULL, 'QUESTION', 3508, 4, 16, '2026-03-17 14:00:00', '2026-03-17 14:00:00', NULL),
  (4008, 2005, 1007, 'Three tiny sessions beat one long session for my small dog', 'We switched to three short training blocks each day and got better attention with less frustration. Sharing this in case anyone else is stuck in long-session burnout.', NULL, 'DISCUSSION', 3509, 10, 41, '2026-03-16 18:20:00', '2026-03-16 18:20:00', NULL),
  (4009, 2005, 1011, 'How do I reduce alert barking without making my dog anxious?', 'My small dog barks at hallway noise in our apartment and I want to reduce this without punishing or increasing stress. What training sequence worked best for you?', NULL, 'QUESTION', 3510, 8, 33, '2026-03-17 08:30:00', '2026-03-17 08:30:00', NULL),
  (4010, 2006, 1008, 'What is a realistic mobility routine for a 12-year-old dog?', 'Our senior dog is still interested in walks but gets stiff after long outings. I am looking for practical daily movement structure that protects joints and keeps quality of life high.', NULL, 'QUESTION', 3511, 9, 37, '2026-03-16 09:50:00', '2026-03-16 09:50:00', NULL),
  (4011, 2006, 1013, 'Small appetite shifts that helped our senior cat eat steadily', 'What helped most was warming wet food slightly, splitting into smaller portions, and keeping feeding spots quiet. Posting in case this helps someone else troubleshoot low appetite.', NULL, 'DISCUSSION', 3512, 6, 24, '2026-03-17 07:45:00', '2026-03-17 07:45:00', NULL),
  (4012, 2007, 1004, 'Rabbit enclosure updates that reduced stress behaviors', 'We added two hide zones, raised platforms, and changed feeding location. Stress chewing dropped noticeably after one week and litter habits improved too.', NULL, 'DISCUSSION', 3513, 5, 20, '2026-03-16 16:40:00', '2026-03-16 16:40:00', NULL),
  (4013, 2007, 1014, 'How often should I rotate parrot enrichment toys?', 'I am unsure whether rotating weekly is enough or if I should swap toys every few days. Looking for routines that avoid boredom without creating constant disruption.', NULL, 'QUESTION', 3515, 7, 25, '2026-03-17 11:30:00', '2026-03-17 11:30:00', NULL),
  (4014, 2008, 1002, 'Coordinator handoff checklist for emergency same-day transfers', 'Drafting a standard same-day handoff flow so coordinators can move faster without missing consent forms, meds, and transport notes. Please add gaps before we freeze this version.', NULL, 'DISCUSSION', 3518, 3, 14, '2026-03-17 12:10:00', '2026-03-17 12:10:00', NULL),
  (4015, 2003, 1007, 'First-night crate setup for rescue puppies in apartments', 'Could people share what worked for first-night crate setup in apartment buildings where noise is a concern? I am trying to avoid panic barking and keep things calm.', NULL, 'QUESTION', 3506, 6, 21, '2026-03-17 19:10:00', '2026-03-17 19:10:00', NULL);

INSERT INTO community_comment
  (
  id, post_id, parent_comment_id, user_id, content, image_url, vote_score, is_accepted_answer, created_at, deleted_at
  )
VALUES
  (5001, 4001, NULL, 1003, 'At that age I usually suggest three measured meals plus keeping training treats within the daily calorie budget. If appetite feels extreme even with proper portions, mention it at the next vet visit.', NULL, 6, true, '2026-03-15 09:20:00', NULL),
  (5002, 4001, NULL, 1006, 'We switched to two larger meals too early and it backfired for a while. Three meals gave us much steadier energy and fewer scavenging attempts.', NULL, 4, false, '2026-03-15 09:45:00', NULL),
  (5003, 4001, 5001, 1005, 'That helps a lot. I think the treat creep is the part I have been underestimating.', NULL, 2, false, '2026-03-15 10:00:00', NULL),
  (5004, 4002, NULL, 1007, 'Short sessions changed everything for us too. Once I stopped trying to fix the whole walk at once, progress got much more consistent.', NULL, 3, false, '2026-03-15 14:10:00', NULL),
  (5005, 4003, NULL, 1003, 'If the only change was location, I would move the box back first and then reintroduce the new spot gradually. Busy areas can be a big factor for sensitive cats.', NULL, 5, true, '2026-03-16 09:00:00', NULL),
  (5006, 4003, NULL, 1005, 'Mine also refused a box when I switched the litter and location at the same time. Reverting one variable made troubleshooting much easier.', NULL, 3, false, '2026-03-16 09:30:00', NULL),
  (5007, 4005, NULL, 1007, 'The quiet room advice saved us. We were tempted to let our rescue explore the whole apartment immediately and that would have been too much.', NULL, 4, false, '2026-03-14 11:10:00', NULL),
  (5008, 4005, NULL, 1010, 'Would you add anything specific for first-night crate or carrier setup?', NULL, 1, false, '2026-03-14 11:40:00', NULL),
  (5009, 4005, 5008, 1003, 'Yes, a towel that already smells like the shelter or foster home can make the first night much easier for some pets.', NULL, 2, false, '2026-03-14 12:00:00', NULL),
  (5010, 4006, NULL, 1003, 'For a new adoption with no urgent symptoms, booking within the first week is usually a good balance. It gives you a baseline exam without making day one even more overwhelming.', NULL, 6, true, '2026-03-17 10:05:00', NULL),
  (5011, 4006, NULL, 1004, 'If you already have vaccine paperwork, bring it and write down any food or stool questions before the visit so you do not forget them.', NULL, 3, false, '2026-03-17 10:20:00', NULL),
  (5012, 4007, NULL, 1009, 'I can cover Saturday afternoon through Monday morning and I am comfortable with simple medication schedules.', NULL, 2, false, '2026-03-17 14:30:00', NULL),
  (5013, 4008, NULL, 1003, 'This mirrors what I see in practice. Tiny wins repeated daily beat rare intense sessions for most small breeds.', NULL, 4, false, '2026-03-16 18:45:00', NULL),
  (5014, 4008, NULL, 1012, 'We also started ending each session with a calm settle cue and it lowered post-training zoomies a lot.', NULL, 2, false, '2026-03-16 19:10:00', NULL),
  (5015, 4009, NULL, 1007, 'Start by rewarding quiet pauses before the bark escalates. We used hallway noise recordings at low volume first.', NULL, 5, true, '2026-03-17 09:00:00', NULL),
  (5016, 4009, 5015, 1011, 'Great tip. Did you pair that with a place-mat behavior or just engagement games?', NULL, 1, false, '2026-03-17 09:15:00', NULL),
  (5017, 4009, 5016, 1007, 'Yes, place-mat plus high-value reward on calm check-in was the turning point for us.', NULL, 1, false, '2026-03-17 09:25:00', NULL),
  (5018, 4010, NULL, 1003, 'For many senior dogs, shorter but more frequent walks plus gentle indoor mobility work is safer than long single outings.', NULL, 5, true, '2026-03-16 10:30:00', NULL),
  (5019, 4010, NULL, 1006, 'We track stiffness after each walk with a simple 1 to 5 score and adjust next-day duration accordingly.', NULL, 2, false, '2026-03-16 11:00:00', NULL),
  (5020, 4011, NULL, 1008, 'Warming food slightly also helped us. We kept portions tiny and offered 4 to 5 times instead of 2 large meals.', NULL, 3, false, '2026-03-17 08:05:00', NULL),
  (5021, 4012, NULL, 1014, 'The hide zones idea worked for our rabbit too, especially when guests are over and movement is noisy.', NULL, 2, false, '2026-03-16 17:20:00', NULL),
  (5022, 4013, NULL, 1004, 'Weekly is a good baseline, but rotate sooner if engagement drops. Keep one familiar toy to reduce stress.', NULL, 4, true, '2026-03-17 11:50:00', NULL),
  (5023, 4013, 5022, 1014, 'Thanks, I like the idea of keeping one familiar anchor while rotating the rest.', NULL, 1, false, '2026-03-17 12:02:00', NULL),
  (5024, 4014, NULL, 1004, 'Please include a mandatory meds photo before handoff. We had one close call last month.', NULL, 2, false, '2026-03-17 12:30:00', NULL),
  (5025, 4014, NULL, 1015, 'Could we also add backup transporter confirmation to the checklist? That is where delays usually happen.', NULL, 2, false, '2026-03-17 12:42:00', NULL),
  (5026, 4015, NULL, 1003, 'For first-night crate setup, keep it near your sleeping area and cover part of it for visual calm.', NULL, 4, true, '2026-03-17 19:35:00', NULL),
  (5027, 4015, NULL, 1010, 'White noise plus a short late-evening potty break helped us avoid the 3am panic cycle.', NULL, 2, false, '2026-03-17 19:50:00', NULL),
  (5028, 4015, 5026, 1007, 'That sounds practical. I will try partial cover and nearby placement on night one.', NULL, 1, false, '2026-03-17 20:05:00', NULL);

INSERT INTO community_vote
  (
  id, user_id, target_id, target_type, value
  )
VALUES
  (6001, 1003, 4001, 'POST', 1),
  (6002, 1006, 4001, 'POST', 1),
  (6003, 1007, 4001, 'POST', 1),
  (6004, 1009, 4001, 'POST', 1),
  (6005, 1005, 5001, 'COMMENT', 1),
  (6006, 1006, 5001, 'COMMENT', 1),
  (6007, 1007, 5001, 'COMMENT', 1),
  (6008, 1005, 4005, 'POST', 1),
  (6009, 1007, 4005, 'POST', 1),
  (6010, 1010, 4005, 'POST', 1),
  (6011, 1004, 4006, 'POST', 1),
  (6012, 1003, 5005, 'COMMENT', 1),
  (6013, 1003, 4008, 'POST', 1),
  (6014, 1011, 4008, 'POST', 1),
  (6015, 1012, 4008, 'POST', 1),
  (6016, 1007, 4009, 'POST', 1),
  (6017, 1005, 4009, 'POST', 1),
  (6018, 1011, 5015, 'COMMENT', 1),
  (6019, 1003, 4010, 'POST', 1),
  (6020, 1006, 4010, 'POST', 1),
  (6021, 1013, 4011, 'POST', 1),
  (6022, 1008, 4011, 'POST', 1),
  (6023, 1014, 4012, 'POST', 1),
  (6024, 1009, 4012, 'POST', 1),
  (6025, 1004, 4013, 'POST', 1),
  (6026, 1014, 5022, 'COMMENT', 1),
  (6027, 1004, 4014, 'POST', 1),
  (6028, 1003, 4015, 'POST', 1);

INSERT INTO conversation
  (
  id, participant_one_id, participant_two_id, created_at, last_message_at
  )
VALUES
  (7001, 1005, 1003, '2026-03-16 15:00:00', '2026-03-18 08:30:00'),
  (7002, 1006, 1005, '2026-03-16 17:20:00', '2026-03-17 19:10:00'),
  (7003, 1009, 1004, '2026-03-17 13:50:00', '2026-03-17 14:15:00'),
  (7004, 1011, 1007, '2026-03-17 08:55:00', '2026-03-17 09:27:00'),
  (7005, 1014, 1004, '2026-03-17 11:45:00', '2026-03-17 12:03:00');

INSERT INTO message
  (
  id, conversation_id, sender_id, content, read_at, created_at, deleted_at
  )
VALUES
  (8001, 7001, 1005, 'Thanks again for the feeding advice in the retriever community.', '2026-03-16 15:05:00', '2026-03-16 15:01:00', NULL),
  (8002, 7001, 1003, 'Happy to help. If appetite spikes continue, keep a quick note for the next checkup.', '2026-03-16 15:06:00', '2026-03-16 15:04:00', NULL),
  (8003, 7001, 1005, 'Will do. I might post an update next week.', NULL, '2026-03-18 08:30:00', NULL),
  (8004, 7002, 1006, 'Did the cat litter transition ever settle down for you?', '2026-03-16 17:30:00', '2026-03-16 17:21:00', NULL),
  (8005, 7002, 1005, 'Yes, moving the box back for two days fixed the panic and then I changed location more slowly.', '2026-03-16 17:35:00', '2026-03-16 17:34:00', NULL),
  (8006, 7002, 1006, 'That is reassuring. I am going to try one change at a time tonight.', NULL, '2026-03-17 19:10:00', NULL),
  (8007, 7003, 1004, 'Can you confirm your availability for the foster handoff this weekend?', '2026-03-17 14:00:00', '2026-03-17 13:55:00', NULL),
  (8008, 7003, 1009, 'Yes, Saturday after 2pm works for me and I can take the supply bag too.', NULL, '2026-03-17 14:15:00', NULL),
  (8009, 7004, 1011, 'Thanks for the barking advice thread. I started with lower hallway noise playback.', '2026-03-17 09:00:00', '2026-03-17 08:58:00', NULL),
  (8010, 7004, 1007, 'Great start. Keep sessions short and reward calm before reactions escalate.', '2026-03-17 09:01:00', '2026-03-17 09:01:00', NULL),
  (8011, 7004, 1011, 'Will do. I also added place-mat training and it already feels more structured.', NULL, '2026-03-17 09:27:00', NULL),
  (8012, 7005, 1014, 'Your toy rotation suggestion was exactly what I needed for my parrot.', '2026-03-17 11:50:00', '2026-03-17 11:46:00', NULL),
  (8013, 7005, 1004, 'Glad it helped. Keep one familiar toy in the cage so swaps feel less abrupt.', '2026-03-17 11:55:00', '2026-03-17 11:54:00', NULL),
  (8014, 7005, 1014, 'Makes sense, I will start a weekly rotation plan tonight.', NULL, '2026-03-17 12:03:00', NULL);

INSERT INTO message_attachment
  (
  id, message_id, file_url, file_type, file_data
  )
VALUES
  (9001, 8007, '/uploads/community/attachments/foster-checklist.pdf', 'application/pdf', NULL),
  (9002, 8012, '/uploads/community/attachments/parrot-rotation-plan.png', 'image/png', NULL),
  (9003, 8014, '/uploads/community/attachments/toy-schedule.txt', 'text/plain', NULL);

INSERT INTO community_follow
  (
  id, follower_id, followee_id, follow_type, created_at
  )
VALUES
  (9101, 1005, 1003, 'USER', '2026-03-11 09:20:00'),
  (9102, 1006, 1005, 'USER', '2026-03-11 09:40:00'),
  (9103, 1007, 1004, 'USER', '2026-03-11 10:05:00'),
  (9104, 1011, 1007, 'USER', '2026-03-11 10:40:00'),
  (9105, 1014, 1004, 'USER', '2026-03-11 11:00:00'),
  (9106, 1005, 2001, 'COMMUNITY', '2026-03-11 11:15:00'),
  (9107, 1006, 2002, 'COMMUNITY', '2026-03-11 11:20:00'),
  (9108, 1007, 2005, 'COMMUNITY', '2026-03-11 11:25:00'),
  (9109, 1010, 2003, 'COMMUNITY', '2026-03-11 11:35:00'),
  (9110, 1013, 2006, 'COMMUNITY', '2026-03-11 11:50:00');

-- ============================================================
-- HIGH-VOLUME LOAD TEST DATA
-- ============================================================

INSERT INTO community
  (id, name, slug, description, type, created_by, banner_url, icon_url, member_count, created_at)
VALUES
  (2101, 'Late Night Pet Parents', 'late-night-pet-parents', 'For people doing 10pm meds, midnight walks, and dawn litter checks. Honest routines, tired jokes, practical support.', 'PUBLIC', 1005, 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=300&q=80', 8, '2026-03-18 19:00:00'),
  (2102, 'Apartment Dogs Cairo', 'apartment-dogs-cairo', 'Apartment-dog routines for elevators, tight hallways, and noise-sensitive neighbors.', 'PUBLIC', 1007, 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?auto=format&fit=crop&w=300&q=80', 9, '2026-03-18 19:15:00'),
  (2103, 'Reactive Dog Recovery', 'reactive-dog-recovery', 'Small wins for leash-reactive dogs. Trigger maps, decompression plans, and realistic expectations.', 'PUBLIC', 1003, 'https://images.unsplash.com/photo-1535930749574-1399327ce78f?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=300&q=80', 10, '2026-03-18 19:30:00'),
  (2104, 'Cat Litter Detective', 'cat-litter-detective', 'Behavior shifts, litter setup experiments, and calm troubleshooting for indoor cats.', 'PUBLIC', 1006, 'https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=300&q=80', 8, '2026-03-18 19:45:00'),
  (2105, 'Senior Cat Kitchen', 'senior-cat-kitchen', 'Meal texture, hydration hacks, appetite tracking, and tiny routine adjustments for older cats.', 'PUBLIC', 1008, 'https://images.unsplash.com/photo-1546975490-e8b92a360b24?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=300&q=80', 7, '2026-03-18 20:00:00'),
  (2106, 'Foster Handoff Ops', 'foster-handoff-ops', 'Private operations room for transport timing, med notes, and emergency backup plans.', 'PRIVATE', 1002, 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=300&q=80', 6, '2026-03-18 20:15:00'),
  (2107, 'Rabbit Habitat Lab', 'rabbit-habitat-lab', 'Flooring, hide-box layouts, litter success, and chew-safe enrichment for indoor rabbits.', 'PUBLIC', 1014, 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=300&q=80', 6, '2026-03-18 20:30:00'),
  (2108, 'Parrot Routine Board', 'parrot-routine-board', 'Enrichment rotation, noise windows, and species-specific care routines for parrots.', 'PUBLIC', 1004, 'https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1480044965905-02098d419e96?auto=format&fit=crop&w=300&q=80', 5, '2026-03-18 20:40:00'),
  (2109, 'New Adopter Nerves', 'new-adopter-nerves', 'First-week panic, crate sleep, feeding doubts, and real checklists from recent adopters.', 'PUBLIC', 1010, 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=300&q=80', 8, '2026-03-18 20:50:00'),
  (2110, 'Quiet Home Grooming', 'quiet-home-grooming', 'Low-stress nail, brush, and bath routines for anxious pets at home.', 'PUBLIC', 1009, 'https://images.unsplash.com/photo-1525253086316-d0c936c814f8?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=300&q=80', 7, '2026-03-18 21:00:00');

INSERT INTO community_rule
  (id, community_id, title, description, rule_order)
VALUES
  (11001, 2101, 'Post actual timeline', 'Include exact times when asking late-night routine questions.', 1),
  (11002, 2101, 'No guilt language', 'Support each other; avoid blaming tones.', 2),
  (11003, 2101, 'Follow up next day', 'Share outcomes after trying advice.', 3),
  (11004, 2102, 'Apartment context required', 'Mention floor level, elevator use, and hallway triggers.', 1),
  (11005, 2102, 'Noise-safe advice only', 'No methods that escalate barking or panic.', 2),
  (11006, 2102, 'Respect neighbors', 'No dismissive comments about building rules.', 3),
  (11007, 2103, 'No aversive tools', 'This group is force-free only.', 1),
  (11008, 2103, 'Describe triggers clearly', 'Distance, motion, and context are required.', 2),
  (11009, 2103, 'Share decompression plan', 'If posting setbacks, include recovery strategy.', 3),
  (11010, 2104, 'One change at a time', 'Avoid changing litter type and box location together.', 1),
  (11011, 2104, 'Add photos when possible', 'Box setup photos speed up troubleshooting.', 2),
  (11012, 2104, 'Vet escalation allowed', 'Medical red flags should be stated directly.', 3),
  (11013, 2105, 'Hydration first', 'Include water and wet food details.', 1),
  (11014, 2105, 'Tiny portions encouraged', 'Discuss meal frequency, not only total amount.', 2),
  (11015, 2105, 'Track appetite daily', 'Share 3-day trend if asking for help.', 3),
  (11016, 2106, 'Private details stay private', 'No addresses in public text.', 1),
  (11017, 2106, 'Med notes mandatory', 'Every handoff post needs dosage details.', 2),
  (11018, 2106, 'Confirm backup transporter', 'No transport plan is valid without a backup.', 3),
  (11019, 2107, 'Species-specific only', 'Rabbit-specific guidance only.', 1),
  (11020, 2107, 'Chew-safe materials', 'List material type before recommendations.', 2),
  (11021, 2107, 'Observe stress signals', 'Document behavior change windows.', 3),
  (11022, 2108, 'Rotation logs welcome', 'Post enrichment rotation schedule screenshots.', 1),
  (11023, 2108, 'No wing-clip debates', 'Keep focus on daily routines and welfare.', 2),
  (11024, 2108, 'Respect noise constraints', 'Apartment/parrot coexistence advice only.', 3),
  (11025, 2109, 'Beginner-safe answers', 'Assume poster is first-time adopter.', 1),
  (11026, 2109, 'Checklists over opinions', 'Provide clear sequences and time windows.', 2),
  (11027, 2109, 'Celebrate small wins', 'Progress posts are encouraged.', 3),
  (11028, 2110, 'Consent-based handling', 'No force restraint guidance.', 1),
  (11029, 2110, 'Short sessions', 'Recommend 2-5 minute grooming reps.', 2),
  (11030, 2110, 'Document triggers', 'Note exact sounds/touches that trigger stress.', 3);

INSERT INTO flair
  (id, community_id, name, color, text_color)
VALUES
  (12001, 2101, 'Night Shift', '#1E3A8A', '#FFFFFF'), (12002, 2101, 'Routine', '#0F766E', '#FFFFFF'), (12003, 2101, 'Setback', '#B91C1C', '#FFFFFF'), (12004, 2101, 'Win', '#16A34A', '#FFFFFF'),
  (12005, 2102, 'Hallway', '#334155', '#FFFFFF'), (12006, 2102, 'Barking', '#F59E0B', '#FFFFFF'), (12007, 2102, 'Training', '#0EA5E9', '#FFFFFF'), (12008, 2102, 'Success', '#16A34A', '#FFFFFF'),
  (12009, 2103, 'Trigger Map', '#1D4ED8', '#FFFFFF'), (12010, 2103, 'Recovery', '#059669', '#FFFFFF'), (12011, 2103, 'Question', '#D97706', '#FFFFFF'), (12012, 2103, 'Breakthrough', '#16A34A', '#FFFFFF'),
  (12013, 2104, 'Litter', '#7C3AED', '#FFFFFF'), (12014, 2104, 'Behavior', '#2563EB', '#FFFFFF'), (12015, 2104, 'Urgent', '#B91C1C', '#FFFFFF'), (12016, 2104, 'Solved', '#16A34A', '#FFFFFF'),
  (12017, 2105, 'Appetite', '#16A34A', '#FFFFFF'), (12018, 2105, 'Hydration', '#0284C7', '#FFFFFF'), (12019, 2105, 'Question', '#D97706', '#FFFFFF'), (12020, 2105, 'Update', '#0F766E', '#FFFFFF'),
  (12021, 2106, 'Urgent Ops', '#B91C1C', '#FFFFFF'), (12022, 2106, 'Transport', '#0369A1', '#FFFFFF'), (12023, 2106, 'Meds', '#4C1D95', '#FFFFFF'), (12024, 2106, 'Resolved', '#15803D', '#FFFFFF'),
  (12025, 2107, 'Habitat', '#0891B2', '#FFFFFF'), (12026, 2107, 'Litter', '#7C3AED', '#FFFFFF'), (12027, 2107, 'Diet', '#EA580C', '#FFFFFF'), (12028, 2107, 'Progress', '#16A34A', '#FFFFFF'),
  (12029, 2108, 'Enrichment', '#0EA5E9', '#FFFFFF'), (12030, 2108, 'Noise', '#334155', '#FFFFFF'), (12031, 2108, 'Question', '#D97706', '#FFFFFF'), (12032, 2108, 'Routine Win', '#16A34A', '#FFFFFF'),
  (12033, 2109, 'First Week', '#059669', '#FFFFFF'), (12034, 2109, 'Crate', '#1D4ED8', '#FFFFFF'), (12035, 2109, 'Question', '#D97706', '#FFFFFF'), (12036, 2109, 'Checklist', '#0F766E', '#FFFFFF'),
  (12037, 2110, 'Brushing', '#0EA5E9', '#FFFFFF'), (12038, 2110, 'Nails', '#B45309', '#FFFFFF'), (12039, 2110, 'Bath', '#334155', '#FFFFFF'), (12040, 2110, 'Desensitization', '#16A34A', '#FFFFFF');

INSERT INTO community_member
  (id, community_id, user_id, role, joined_at)
VALUES
  (15001, 2101, 1005, 'CREATOR', '2026-03-18 19:00:00'), (15002, 2101, 1003, 'MODERATOR', '2026-03-18 19:04:00'), (15003, 2101, 1006, 'MEMBER', '2026-03-18 19:08:00'), (15004, 2101, 1007, 'MEMBER', '2026-03-18 19:13:00'), (15005, 2101, 1009, 'MEMBER', '2026-03-18 19:17:00'), (15006, 2101, 1011, 'MEMBER', '2026-03-18 19:20:00'),
  (15007, 2102, 1007, 'CREATOR', '2026-03-18 19:15:00'), (15008, 2102, 1003, 'MODERATOR', '2026-03-18 19:18:00'), (15009, 2102, 1011, 'MEMBER', '2026-03-18 19:22:00'), (15010, 2102, 1012, 'MEMBER', '2026-03-18 19:25:00'), (15011, 2102, 1005, 'MEMBER', '2026-03-18 19:27:00'), (15012, 2102, 1013, 'MEMBER', '2026-03-18 19:31:00'),
  (15013, 2103, 1003, 'CREATOR', '2026-03-18 19:30:00'), (15014, 2103, 1004, 'MODERATOR', '2026-03-18 19:34:00'), (15015, 2103, 1007, 'MEMBER', '2026-03-18 19:39:00'), (15016, 2103, 1010, 'MEMBER', '2026-03-18 19:43:00'), (15017, 2103, 1014, 'MEMBER', '2026-03-18 19:47:00'), (15018, 2103, 1015, 'MEMBER', '2026-03-18 19:50:00'),
  (15019, 2104, 1006, 'CREATOR', '2026-03-18 19:45:00'), (15020, 2104, 1003, 'MODERATOR', '2026-03-18 19:49:00'), (15021, 2104, 1005, 'MEMBER', '2026-03-18 19:54:00'), (15022, 2104, 1008, 'MEMBER', '2026-03-18 19:57:00'), (15023, 2104, 1013, 'MEMBER', '2026-03-18 20:01:00'), (15024, 2104, 1011, 'MEMBER', '2026-03-18 20:05:00'),
  (15025, 2105, 1008, 'CREATOR', '2026-03-18 20:00:00'), (15026, 2105, 1003, 'MODERATOR', '2026-03-18 20:03:00'), (15027, 2105, 1006, 'MEMBER', '2026-03-18 20:07:00'), (15028, 2105, 1013, 'MEMBER', '2026-03-18 20:10:00'), (15029, 2105, 1010, 'MEMBER', '2026-03-18 20:13:00'), (15030, 2105, 1011, 'MEMBER', '2026-03-18 20:16:00'),
  (15031, 2106, 1002, 'CREATOR', '2026-03-18 20:15:00'), (15032, 2106, 1004, 'MODERATOR', '2026-03-18 20:18:00'), (15033, 2106, 1009, 'MEMBER', '2026-03-18 20:20:00'), (15034, 2106, 1015, 'MEMBER', '2026-03-18 20:24:00'), (15035, 2106, 1007, 'MEMBER', '2026-03-18 20:27:00'), (15036, 2106, 1012, 'MEMBER', '2026-03-18 20:30:00'),
  (15037, 2107, 1014, 'CREATOR', '2026-03-18 20:30:00'), (15038, 2107, 1004, 'MODERATOR', '2026-03-18 20:33:00'), (15039, 2107, 1009, 'MEMBER', '2026-03-18 20:36:00'), (15040, 2107, 1003, 'MEMBER', '2026-03-18 20:39:00'), (15041, 2107, 1006, 'MEMBER', '2026-03-18 20:42:00'), (15042, 2107, 1011, 'MEMBER', '2026-03-18 20:45:00'),
  (15043, 2108, 1004, 'CREATOR', '2026-03-18 20:40:00'), (15044, 2108, 1014, 'MODERATOR', '2026-03-18 20:43:00'), (15045, 2108, 1010, 'MEMBER', '2026-03-18 20:47:00'), (15046, 2108, 1008, 'MEMBER', '2026-03-18 20:51:00'), (15047, 2108, 1003, 'MEMBER', '2026-03-18 20:55:00'), (15048, 2108, 1006, 'MEMBER', '2026-03-18 20:58:00'),
  (15049, 2109, 1010, 'CREATOR', '2026-03-18 20:50:00'), (15050, 2109, 1003, 'MODERATOR', '2026-03-18 20:53:00'), (15051, 2109, 1007, 'MEMBER', '2026-03-18 20:57:00'), (15052, 2109, 1005, 'MEMBER', '2026-03-18 21:01:00'), (15053, 2109, 1011, 'MEMBER', '2026-03-18 21:05:00'), (15054, 2109, 1012, 'MEMBER', '2026-03-18 21:08:00'),
  (15055, 2110, 1009, 'CREATOR', '2026-03-18 21:00:00'), (15056, 2110, 1003, 'MODERATOR', '2026-03-18 21:03:00'), (15057, 2110, 1005, 'MEMBER', '2026-03-18 21:07:00'), (15058, 2110, 1006, 'MEMBER', '2026-03-18 21:11:00'), (15059, 2110, 1013, 'MEMBER', '2026-03-18 21:14:00'), (15060, 2110, 1014, 'MEMBER', '2026-03-18 21:17:00');

UPDATE community SET member_count = 6 WHERE id BETWEEN 2101 AND 2110;

INSERT INTO community_post
  (id, community_id, user_id, title, content, image_url, type, flair_id, vote_score, view_count, created_at, updated_at, deleted_at)
VALUES
  (20000, 2101, 1005, '2:13am bathroom panic solved with one lamp change', 'We moved the hallway lamp from cool white to warm and my dog stopped freezing at the doorway during late-night potty breaks. Same route, same leash, only light color changed.', NULL, 'DISCUSSION', 12002, 31, 412, '2026-03-20 02:13:00', '2026-03-20 02:13:00', NULL),
  (20001, 2101, 1011, 'Night meds + food timing question for anxious stomachs', 'If meds are at 11pm, do you feed before or after? We tried both and had one night of nausea. Looking for timing from people with similar issues.', NULL, 'QUESTION', 12001, 24, 355, '2026-03-20 22:40:00', '2026-03-20 22:40:00', NULL),
  (20002, 2102, 1007, 'Elevator barking reduced after scripted hallway routine', 'Three steps helped us: pause at door, treat on eye contact, and one calm sit before elevator call. Took five days to see stable change.', NULL, 'DISCUSSION', 12007, 48, 630, '2026-03-21 08:05:00', '2026-03-21 08:05:00', NULL),
  (20003, 2102, 1012, 'How do you handle surprise neighbors at corner turns?', 'My dog is fine with known people but panics when someone appears suddenly near the staircase. Need practical drill ideas.', NULL, 'QUESTION', 12005, 17, 289, '2026-03-21 09:10:00', '2026-03-21 09:10:00', NULL),
  (20004, 2103, 1003, 'Trigger map template that actually changed our week', 'We tracked time, distance, motion speed, and recovery minutes for 7 days. The biggest insight was that bikes were easier than scooters if distance stayed above 8 meters.', NULL, 'DISCUSSION', 12009, 53, 701, '2026-03-21 10:40:00', '2026-03-21 10:40:00', NULL),
  (20005, 2103, 1010, 'Setback today: barking at one child after two calm walks', 'Need help reframing this so we do not spiral. We had two great days then one loud reaction near school pickup.', NULL, 'QUESTION', 12011, 22, 344, '2026-03-21 16:20:00', '2026-03-21 16:20:00', NULL),
  (20006, 2104, 1006, 'Litter refusal ended after returning old mat texture', 'The litter itself was not the issue. The new rubber mat felt unstable under paws. Switched back to cloth and the problem resolved in 24 hours.', NULL, 'DISCUSSION', 12016, 44, 589, '2026-03-21 11:15:00', '2026-03-21 11:15:00', NULL),
  (20007, 2104, 1013, 'Question: covered box + hallway placement bad combo?', 'Our cat started peeing next to the box after we moved it to hallway and changed to covered style. Should we undo both at once or one variable first?', NULL, 'QUESTION', 12013, 20, 306, '2026-03-21 12:05:00', '2026-03-21 12:05:00', NULL),
  (20008, 2105, 1008, 'Senior cat ate full portion after warming plate not food', 'Surprising detail: warming ceramic plate slightly worked better than warming the food itself. Scent stayed normal and intake improved.', NULL, 'DISCUSSION', 12017, 38, 477, '2026-03-21 07:35:00', '2026-03-21 07:35:00', NULL),
  (20009, 2105, 1010, 'Hydration question with kidney diet kibble refusal', 'He drinks but refuses the kidney kibble unless mixed. Looking for mix ratios that do not trigger bowl flipping.', NULL, 'QUESTION', 12018, 19, 250, '2026-03-21 21:15:00', '2026-03-21 21:15:00', NULL),
  (20010, 2106, 1002, 'Urgent: driver cancelled 45 min before foster handoff', 'Need backup transporter from Maadi to Nasr City tonight, medium crate, meds included, signed forms ready.', NULL, 'QUESTION', 12021, 29, 401, '2026-03-21 17:50:00', '2026-03-21 17:50:00', NULL),
  (20011, 2106, 1004, 'Handoff checklist v4 with med-photo confirmation', 'Added mandatory med blister photo, dose timestamp, and backup transporter phone check before departure.', NULL, 'DISCUSSION', 12024, 33, 448, '2026-03-21 18:30:00', '2026-03-21 18:30:00', NULL),
  (20012, 2107, 1014, 'Hide-box angle changed litter consistency in 3 days', 'We moved hide boxes away from litter corner and accidents dropped from daily to zero in 72 hours.', NULL, 'DISCUSSION', 12028, 27, 360, '2026-03-22 09:25:00', '2026-03-22 09:25:00', NULL),
  (20013, 2107, 1009, 'Question: hay rack height for timid rabbit?', 'Too low and she sits in it, too high and she ignores it. Any measurements from similar body size?', NULL, 'QUESTION', 12027, 14, 218, '2026-03-22 10:30:00', '2026-03-22 10:30:00', NULL),
  (20014, 2108, 1004, 'Toy rotation every 4 days stopped screaming at 6am', 'We moved from weekly swaps to every 4 days with one anchor toy left untouched. Morning screaming dropped sharply.', NULL, 'DISCUSSION', 12032, 35, 496, '2026-03-22 06:55:00', '2026-03-22 06:55:00', NULL),
  (20015, 2108, 1010, 'Need noise-window routine for apartment parrots', 'We can do play at 7am and 7pm only due building rules. Looking for enrichment that does not trigger loud contact calls midday.', NULL, 'QUESTION', 12030, 16, 234, '2026-03-22 14:00:00', '2026-03-22 14:00:00', NULL),
  (20016, 2109, 1010, 'First adoption night: crate crying peaked at 1:20am then settled', 'Kept crate near bed, white noise low, no eye contact during whining. Settled after 11 minutes. Sharing exact sequence in case helpful.', NULL, 'DISCUSSION', 12033, 41, 560, '2026-03-22 01:35:00', '2026-03-22 01:35:00', NULL),
  (20017, 2109, 1007, 'Question: first-week visitors yes or no?', 'Family wants to visit day 2 but pup startles easily. Should we delay social visits until week 2?', NULL, 'QUESTION', 12035, 23, 331, '2026-03-22 13:10:00', '2026-03-22 13:10:00', NULL),
  (20018, 2110, 1009, 'Nail trims improved after 20-second paw-touch reps', 'We did 4 reps per day with marker word and high-value reward. First full trim happened on day 9 with no panic.', NULL, 'DISCUSSION', 12038, 28, 384, '2026-03-22 08:20:00', '2026-03-22 08:20:00', NULL),
  (20019, 2110, 1013, 'Bath question for rescue dog that fears running water', 'Can do sponge wipe calmly but shower sound triggers shaking. Looking for step-by-step desensitization timeline.', NULL, 'QUESTION', 12039, 21, 295, '2026-03-22 20:45:00', '2026-03-22 20:45:00', NULL);

INSERT INTO community_comment
  (id, post_id, parent_comment_id, user_id, content, image_url, vote_score, is_accepted_answer, created_at, deleted_at)
VALUES
  (30000, 20000, NULL, 1003, 'Warm light was the fix for us too. Cool LEDs made the hallway shadows sharp and my dog froze every night.', NULL, 12, 0, '2026-03-20 02:20:00', NULL),
  (30001, 20000, 30000, 1005, 'Exactly. Once shadows softened she walked through without the stop-start behavior.', NULL, 8, 0, '2026-03-20 02:24:00', NULL),
  (30002, 20000, NULL, 1006, 'Did you keep the same leash length? We accidentally changed two variables at once and had confusing results.', NULL, 5, 0, '2026-03-20 02:30:00', NULL),
  (30003, 20000, 30002, 1005, 'Same leash, same route, same treat. Only bulb color changed.', NULL, 7, 1, '2026-03-20 02:34:00', NULL),

  (30004, 20001, NULL, 1013, 'We feed 25 minutes before meds. Empty stomach made nausea worse for ours.', NULL, 9, 1, '2026-03-20 22:48:00', NULL),
  (30005, 20001, NULL, 1008, 'Opposite here: tiny snack after meds worked better. You may need a 3-night comparison.', NULL, 6, 0, '2026-03-20 22:55:00', NULL),
  (30006, 20001, 30005, 1011, 'I can run that test and post timings tomorrow night.', NULL, 3, 0, '2026-03-20 23:02:00', NULL),

  (30007, 20002, NULL, 1012, 'The pre-elevator sit changed everything in our building too. It breaks the frantic momentum.', NULL, 11, 0, '2026-03-21 08:20:00', NULL),
  (30008, 20002, NULL, 1005, 'Adding one sniff break after leaving elevator also prevented hallway explosions for us.', NULL, 7, 0, '2026-03-21 08:31:00', NULL),
  (30009, 20002, 30008, 1007, 'Good point. I now cue sniff after exit and before corner turns.', NULL, 5, 0, '2026-03-21 08:36:00', NULL),

  (30010, 20003, NULL, 1003, 'Do 3 reps daily with staged surprises: friend appears at distance, toss treat, retreat.', NULL, 10, 1, '2026-03-21 09:22:00', NULL),
  (30011, 20003, 30010, 1012, 'Distance target?', NULL, 2, 0, '2026-03-21 09:25:00', NULL),
  (30012, 20003, 30011, 1003, 'Start 8 meters, reduce by 1 meter only after two calm sessions.', NULL, 8, 0, '2026-03-21 09:28:00', NULL),

  (30013, 20004, NULL, 1014, 'Thanks for posting actual numbers. Most threads skip recovery minutes and that is what we needed.', NULL, 9, 0, '2026-03-21 10:52:00', NULL),
  (30014, 20004, NULL, 1007, 'Could you share your sheet columns?', NULL, 3, 0, '2026-03-21 11:02:00', NULL),
  (30015, 20004, 30014, 1003, 'Time, trigger type, trigger speed, distance, bark count, recovery minutes, next-step note.', NULL, 12, 1, '2026-03-21 11:08:00', NULL),

  (30016, 20005, NULL, 1004, 'One reaction after two calm walks is not failure. Keep baseline route tomorrow and shorten duration.', NULL, 10, 1, '2026-03-21 16:28:00', NULL),
  (30017, 20005, NULL, 1015, 'We log weather too. Windy days were always worse for us.', NULL, 4, 0, '2026-03-21 16:35:00', NULL),
  (30018, 20005, 30017, 1010, 'That is smart. Today was very windy actually.', NULL, 4, 0, '2026-03-21 16:39:00', NULL),

  (30019, 20006, NULL, 1005, 'Texture sensitivity is so real. Mine refused the box when the new mat slid under paws.', NULL, 8, 0, '2026-03-21 11:24:00', NULL),
  (30020, 20006, 30019, 1006, 'Exactly what happened here. Stability fixed everything faster than litter change.', NULL, 6, 1, '2026-03-21 11:30:00', NULL),
  (30021, 20006, NULL, 1008, 'Did you clean with unscented only during reset?', NULL, 3, 0, '2026-03-21 11:36:00', NULL),
  (30022, 20006, 30021, 1006, 'Yes. Unscented cleaner only for that week.', NULL, 4, 0, '2026-03-21 11:40:00', NULL),

  (30023, 20007, NULL, 1003, 'Undo one variable first: keep location, remove cover. Give 72 hours before changing anything else.', NULL, 11, 1, '2026-03-21 12:18:00', NULL),
  (30024, 20007, NULL, 1005, 'Second this. We changed both and lost a week of useful data.', NULL, 5, 0, '2026-03-21 12:22:00', NULL),
  (30025, 20007, 30023, 1013, 'Doing this tonight. I will report by Sunday.', NULL, 3, 0, '2026-03-21 12:29:00', NULL),

  (30026, 20008, NULL, 1013, 'Warm plate trick worked for my senior too. Food scent stayed stable and he ate without backing off.', NULL, 9, 1, '2026-03-21 07:46:00', NULL),
  (30027, 20008, NULL, 1006, 'Can you share plate temp estimate?', NULL, 2, 0, '2026-03-21 07:52:00', NULL),
  (30028, 20008, 30027, 1008, 'Just slightly warm to touch, never hot. Around 30-32C by thermometer.', NULL, 7, 0, '2026-03-21 07:57:00', NULL),

  (30029, 20009, NULL, 1008, 'Start 90/10 wet-to-kibble then taper weekly. Sudden ratio changes caused rejection for us.', NULL, 10, 1, '2026-03-21 21:28:00', NULL),
  (30030, 20009, NULL, 1011, 'We add warm water first, then small kibble sprinkle.', NULL, 5, 0, '2026-03-21 21:34:00', NULL),
  (30031, 20009, 30030, 1010, 'Will try this tonight and post intake.', NULL, 3, 0, '2026-03-21 21:38:00', NULL),

  (30032, 20010, NULL, 1009, 'I can drive tonight. Need exact pickup window and crate dimensions.', NULL, 13, 0, '2026-03-21 17:56:00', NULL),
  (30033, 20010, 30032, 1002, 'Pickup 19:10, crate 70x45x52 cm, meds in labeled pouch.', NULL, 9, 1, '2026-03-21 17:59:00', NULL),
  (30034, 20010, NULL, 1015, 'I am backup if traffic gets blocked on ring road.', NULL, 8, 0, '2026-03-21 18:03:00', NULL),
  (30035, 20010, 30034, 1002, 'Perfect, saving your number to handoff sheet now.', NULL, 6, 0, '2026-03-21 18:07:00', NULL),

  (30036, 20011, NULL, 1007, 'The med-photo requirement prevented two dosing mistakes for us this month.', NULL, 7, 0, '2026-03-21 18:38:00', NULL),
  (30037, 20011, NULL, 1012, 'Please add check box for “backup transporter confirmed by call” not text only.', NULL, 6, 0, '2026-03-21 18:41:00', NULL),
  (30038, 20011, 30037, 1004, 'Added to v4.1. Also added “ETA screenshot attached” field.', NULL, 7, 1, '2026-03-21 18:46:00', NULL),

  (30039, 20012, NULL, 1003, 'Huge win. Rabbits often pick one “safe corner” and layout can accidentally block it.', NULL, 8, 0, '2026-03-22 09:36:00', NULL),
  (30040, 20012, NULL, 1011, 'Did you change flooring at same time?', NULL, 2, 0, '2026-03-22 09:43:00', NULL),
  (30041, 20012, 30040, 1014, 'No flooring change. Only hide-box angle and distance from litter tray.', NULL, 6, 1, '2026-03-22 09:48:00', NULL),

  (30042, 20013, NULL, 1004, 'For timid rabbits, rack edge around shoulder height while standing was ideal.', NULL, 7, 1, '2026-03-22 10:43:00', NULL),
  (30043, 20013, NULL, 1006, 'Mine preferred two small racks in separate zones.', NULL, 4, 0, '2026-03-22 10:49:00', NULL),
  (30044, 20013, 30042, 1009, 'Great. I will try shoulder height tonight.', NULL, 3, 0, '2026-03-22 10:55:00', NULL),

  (30045, 20014, NULL, 1014, 'Anchor toy concept is underrated. It prevents “new-everything panic” during rotation.', NULL, 10, 1, '2026-03-22 07:03:00', NULL),
  (30046, 20014, NULL, 1008, 'What time of day do you rotate?', NULL, 2, 0, '2026-03-22 07:09:00', NULL),
  (30047, 20014, 30046, 1004, 'Late afternoon. Morning changes made ours loud before work hours.', NULL, 6, 0, '2026-03-22 07:13:00', NULL),

  (30048, 20015, NULL, 1003, 'Try two silent foraging blocks at noon and reserve vocal toys for evening window.', NULL, 9, 1, '2026-03-22 14:12:00', NULL),
  (30049, 20015, NULL, 1014, 'Also cover side-facing window during noon traffic spikes.', NULL, 5, 0, '2026-03-22 14:18:00', NULL),
  (30050, 20015, 30049, 1010, 'Good call. Noon buses are exactly when contact calls peak.', NULL, 4, 0, '2026-03-22 14:22:00', NULL),

  (30051, 20016, NULL, 1003, 'Your sequence is solid. The no-eye-contact rule during whining helped us too.', NULL, 11, 1, '2026-03-22 01:41:00', NULL),
  (30052, 20016, NULL, 1012, 'Did you do a potty break exactly before crate?', NULL, 3, 0, '2026-03-22 01:48:00', NULL),
  (30053, 20016, 30052, 1010, 'Yes, 8 minutes before crate with a short sniff walk only.', NULL, 5, 0, '2026-03-22 01:52:00', NULL),

  (30054, 20017, NULL, 1005, 'Delay visitors. Keep first week predictable and low-social-pressure.', NULL, 9, 1, '2026-03-22 13:18:00', NULL),
  (30055, 20017, NULL, 1007, 'Agree. We postponed to day 10 and it was much smoother.', NULL, 6, 0, '2026-03-22 13:24:00', NULL),
  (30056, 20017, 30054, 1011, 'Will postpone. Thank you all, this removes a lot of stress.', NULL, 4, 0, '2026-03-22 13:30:00', NULL),

  (30057, 20018, NULL, 1003, '20-second reps are perfect for sensitive dogs. Anything longer can tip into resistance.', NULL, 8, 1, '2026-03-22 08:28:00', NULL),
  (30058, 20018, NULL, 1006, 'Did you clip one nail per session early on?', NULL, 3, 0, '2026-03-22 08:34:00', NULL),
  (30059, 20018, 30058, 1009, 'Yes, one nail then done for first 5 days.', NULL, 5, 0, '2026-03-22 08:37:00', NULL),

  (30060, 20019, NULL, 1009, 'Start with dry tub exploration + treats before water sound work.', NULL, 10, 1, '2026-03-22 20:52:00', NULL),
  (30061, 20019, NULL, 1014, 'Record faucet at low volume first; pair with lick mat.', NULL, 7, 0, '2026-03-22 20:57:00', NULL),
  (30062, 20019, 30061, 1013, 'Love this. I can do recording sessions between walks.', NULL, 4, 0, '2026-03-22 21:01:00', NULL);

INSERT INTO community_vote
  (id, user_id, target_id, target_type, value)
VALUES
  (50000, 1003, 20000, 'POST', 1), (50001, 1006, 20000, 'POST', 1), (50002, 1007, 20000, 'POST', 1),
  (50003, 1005, 20002, 'POST', 1), (50004, 1011, 20002, 'POST', 1), (50005, 1012, 20002, 'POST', 1),
  (50006, 1004, 20004, 'POST', 1), (50007, 1014, 20004, 'POST', 1), (50008, 1010, 20005, 'POST', 1),
  (50009, 1003, 20006, 'POST', 1), (50010, 1005, 20006, 'POST', 1), (50011, 1008, 20008, 'POST', 1),
  (50012, 1013, 20008, 'POST', 1), (50013, 1008, 20009, 'POST', 1), (50014, 1002, 20010, 'POST', 1),
  (50015, 1009, 20010, 'POST', 1), (50016, 1004, 20011, 'POST', 1), (50017, 1012, 20011, 'POST', 1),
  (50018, 1014, 20012, 'POST', 1), (50019, 1003, 20012, 'POST', 1), (50020, 1004, 20014, 'POST', 1),
  (50021, 1014, 20014, 'POST', 1), (50022, 1003, 20015, 'POST', 1), (50023, 1010, 20016, 'POST', 1),
  (50024, 1007, 20017, 'POST', 1), (50025, 1009, 20018, 'POST', 1), (50026, 1013, 20019, 'POST', 1),
  (50027, 1006, 30003, 'COMMENT', 1), (50028, 1013, 30004, 'COMMENT', 1), (50029, 1007, 30007, 'COMMENT', 1),
  (50030, 1003, 30010, 'COMMENT', 1), (50031, 1004, 30016, 'COMMENT', 1), (50032, 1006, 30020, 'COMMENT', 1),
  (50033, 1003, 30023, 'COMMENT', 1), (50034, 1008, 30026, 'COMMENT', 1), (50035, 1008, 30029, 'COMMENT', 1),
  (50036, 1002, 30033, 'COMMENT', 1), (50037, 1004, 30038, 'COMMENT', 1), (50038, 1014, 30041, 'COMMENT', 1),
  (50039, 1004, 30042, 'COMMENT', 1), (50040, 1004, 30045, 'COMMENT', 1), (50041, 1003, 30048, 'COMMENT', 1),
  (50042, 1010, 30053, 'COMMENT', 1), (50043, 1005, 30054, 'COMMENT', 1), (50044, 1009, 30057, 'COMMENT', 1),
  (50045, 1009, 30060, 'COMMENT', 1), (50046, 1014, 30061, 'COMMENT', 1), (50047, 1013, 30062, 'COMMENT', 1);

INSERT INTO conversation
  (id, participant_one_id, participant_two_id, created_at, last_message_at)
VALUES
  (60000, 1005, 1012, '2026-03-21 21:02:00', '2026-03-22 06:20:00'),
  (60001, 1007, 1013, '2026-03-21 09:45:00', '2026-03-22 08:44:00'),
  (60002, 1003, 1015, '2026-03-21 16:45:00', '2026-03-21 17:10:00'),
  (60003, 1002, 1009, '2026-03-21 17:58:00', '2026-03-21 18:07:00'),
  (60004, 1004, 1010, '2026-03-22 07:11:00', '2026-03-22 14:20:00'),
  (60005, 1008, 1013, '2026-03-21 21:40:00', '2026-03-22 07:55:00');

INSERT INTO message
  (id, conversation_id, sender_id, content, read_at, created_at, deleted_at)
VALUES
  (70000, 60000, 1005, 'Are you awake? Night walk finally worked after light change.', '2026-03-21 21:05:00', '2026-03-21 21:03:00', NULL),
  (70001, 60000, 1003, 'Yes, great update. Keep same route for 3 nights before changing anything.', '2026-03-21 21:07:00', '2026-03-21 21:06:00', NULL),
  (70002, 60000, 1005, 'Will do. Also posting bulb specs in thread now.', NULL, '2026-03-22 06:20:00', NULL),
  (70003, 60001, 1007, 'Your hallway corner tip worked today.', '2026-03-22 08:10:00', '2026-03-22 08:08:00', NULL),
  (70004, 60001, 1011, 'Nice. We used the same cue word and it cut barking by half.', NULL, '2026-03-22 08:44:00', NULL),
  (70005, 60002, 1010, 'Thanks for reframing the setback. Felt less like failure.', '2026-03-21 17:02:00', '2026-03-21 16:58:00', NULL),
  (70006, 60002, 1003, 'You are doing great. Consistency matters more than one rough walk.', NULL, '2026-03-21 17:10:00', NULL),
  (70007, 60003, 1002, 'Can you still do Maadi pickup at 19:10?', '2026-03-21 18:00:00', '2026-03-21 17:59:00', NULL),
  (70008, 60003, 1009, 'Confirmed. Sending live location 20 mins before departure.', NULL, '2026-03-21 18:07:00', NULL),
  (70009, 60004, 1004, 'Could you share your toy rotation PDF?', '2026-03-22 14:12:00', '2026-03-22 14:10:00', NULL),
  (70010, 60004, 1010, 'Uploading now. Includes anchor-toy notes and quiet-hour setup.', NULL, '2026-03-22 14:20:00', NULL),
  (70011, 60005, 1008, 'Warm plate method worked again this morning.', '2026-03-22 07:50:00', '2026-03-22 07:47:00', NULL),
  (70012, 60005, 1013, 'Amazing. I am testing plate temp logs this week.', NULL, '2026-03-22 07:55:00', NULL);

INSERT INTO community_follow
  (id, follower_id, followee_id, follow_type, created_at)
VALUES
  (92000, 1005, 2101, 'COMMUNITY', '2026-03-22 09:00:00'),
  (92001, 1006, 2101, 'COMMUNITY', '2026-03-22 09:01:00'),
  (92002, 1007, 2102, 'COMMUNITY', '2026-03-22 09:02:00'),
  (92003, 1011, 2102, 'COMMUNITY', '2026-03-22 09:03:00'),
  (92004, 1003, 2103, 'COMMUNITY', '2026-03-22 09:04:00'),
  (92005, 1010, 2103, 'COMMUNITY', '2026-03-22 09:05:00'),
  (92006, 1006, 2104, 'COMMUNITY', '2026-03-22 09:06:00'),
  (92007, 1013, 2104, 'COMMUNITY', '2026-03-22 09:07:00'),
  (92008, 1008, 2105, 'COMMUNITY', '2026-03-22 09:08:00'),
  (92009, 1010, 2105, 'COMMUNITY', '2026-03-22 09:09:00'),
  (92010, 1002, 2106, 'COMMUNITY', '2026-03-22 09:10:00'),
  (92011, 1009, 2106, 'COMMUNITY', '2026-03-22 09:11:00'),
  (92012, 1014, 2107, 'COMMUNITY', '2026-03-22 09:12:00'),
  (92013, 1004, 2107, 'COMMUNITY', '2026-03-22 09:13:00'),
  (92014, 1004, 2108, 'COMMUNITY', '2026-03-22 09:14:00'),
  (92015, 1010, 2108, 'COMMUNITY', '2026-03-22 09:15:00'),
  (92016, 1010, 2109, 'COMMUNITY', '2026-03-22 09:16:00'),
  (92017, 1007, 2109, 'COMMUNITY', '2026-03-22 09:17:00'),
  (92018, 1009, 2110, 'COMMUNITY', '2026-03-22 09:18:00'),
  (92019, 1013, 2110, 'COMMUNITY', '2026-03-22 09:19:00');

COMMIT;
