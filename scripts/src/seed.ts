import { db, buildingsTable, categoriesTable, clubsTable, eventsTable, clubMembershipsTable, announcementsTable } from "@workspace/db";

async function main() {
  console.log("Seeding database...");

  // Clear existing data in dependency order
  await db.delete(announcementsTable);
  await db.delete(eventsTable);
  await db.delete(clubMembershipsTable);
  await db.delete(clubsTable);
  await db.delete(buildingsTable);
  await db.delete(categoriesTable);

  // Buildings - real BYU buildings with actual coordinates
  const buildings = await db.insert(buildingsTable).values([
    { name: "Wilkinson Student Center", abbreviation: "WSC", latitude: 40.2469, longitude: -111.6489, address: "Wilkinson Student Center, Provo, UT 84602" },
    { name: "Harold B. Lee Library", abbreviation: "HBLL", latitude: 40.2466, longitude: -111.6497, address: "2060 HBLL, Provo, UT 84602" },
    { name: "Joseph F. Smith Building", abbreviation: "JFSB", latitude: 40.2474, longitude: -111.6512, address: "Joseph F. Smith Building, Provo, UT 84602" },
    { name: "Talmage Building", abbreviation: "TLMG", latitude: 40.2485, longitude: -111.6478, address: "Talmage Building, Provo, UT 84602" },
    { name: "Marriott Center", abbreviation: "MC", latitude: 40.2512, longitude: -111.6515, address: "Marriott Center, Provo, UT 84602" },
    { name: "Kimball Tower", abbreviation: "KT", latitude: 40.2457, longitude: -111.6501, address: "Kimball Tower, Provo, UT 84602" },
    { name: "Benson Building", abbreviation: "BNSN", latitude: 40.2463, longitude: -111.6472, address: "Benson Building, Provo, UT 84602" },
    { name: "Engineering Building", abbreviation: "EB", latitude: 40.2479, longitude: -111.6467, address: "Engineering Building, Provo, UT 84602" },
    { name: "Richards Building", abbreviation: "RB", latitude: 40.2491, longitude: -111.6489, address: "Richards Building, Provo, UT 84602" },
    { name: "LaVell Edwards Stadium", abbreviation: "LES", latitude: 40.2571, longitude: -111.6548, address: "LaVell Edwards Stadium, Provo, UT 84602" },
  ]).returning();

  console.log(`Inserted ${buildings.length} buildings`);

  // Categories
  const categories = await db.insert(categoriesTable).values([
    { name: "Academic", color: "#0062B8", icon: "graduation-cap" },
    { name: "Social", color: "#8B5CF6", icon: "users" },
    { name: "Service", color: "#22C55E", icon: "heart" },
    { name: "Arts & Culture", color: "#F97316", icon: "palette" },
    { name: "Sports & Fitness", color: "#EF4444", icon: "trophy" },
    { name: "Technology", color: "#06B6D4", icon: "cpu" },
    { name: "Religion & Faith", color: "#F59E0B", icon: "star" },
    { name: "Career & Professional", color: "#6366F1", icon: "briefcase" },
    { name: "International", color: "#10B981", icon: "globe" },
    { name: "Food & Cooking", color: "#EC4899", icon: "utensils" },
  ]).returning();

  console.log(`Inserted ${categories.length} categories`);

  const catMap: Record<string, number> = {};
  for (const c of categories) catMap[c.name] = c.id;

  // Clubs
  const clubs = await db.insert(clubsTable).values([
    { name: "BYU CS Society", description: "A community of computer science enthusiasts dedicated to learning, networking, and building the future of technology together.", categoryId: catMap["Technology"], avatarInitials: "CS", avatarColor: "#0062B8", contactEmail: "cs-society@byu.edu" },
    { name: "International Students Association", description: "Connecting international students with resources, friendships, and cultural exchange opportunities across the BYU community.", categoryId: catMap["International"], avatarInitials: "ISA", avatarColor: "#10B981", contactEmail: "isa@byu.edu" },
    { name: "BYU Service Club", description: "Organizing meaningful service opportunities that make a difference locally, nationally, and globally.", categoryId: catMap["Service"], avatarInitials: "SC", avatarColor: "#22C55E", contactEmail: "service-club@byu.edu" },
    { name: "Finance & Investment Club", description: "Teaching practical investing skills, financial literacy, and economic awareness through workshops and competitions.", categoryId: catMap["Career & Professional"], avatarInitials: "FIC", avatarColor: "#6366F1", contactEmail: "finance-club@byu.edu" },
    { name: "BYU Photography Society", description: "Celebrating visual storytelling through photography walks, critiques, exhibitions, and community workshops.", categoryId: catMap["Arts & Culture"], avatarInitials: "PS", avatarColor: "#F97316", contactEmail: "photo-society@byu.edu" },
    { name: "Debate & Oratory Club", description: "Sharpening critical thinking and public speaking skills through competitive debate and professional oratory practice.", categoryId: catMap["Academic"], avatarInitials: "DO", avatarColor: "#0062B8", contactEmail: "debate@byu.edu" },
    { name: "BYU Ballroom Dance Club", description: "Bringing the joy of ballroom dance to the BYU campus with lessons, socials, and competitive performance opportunities.", categoryId: catMap["Arts & Culture"], avatarInitials: "BD", avatarColor: "#EC4899", contactEmail: "ballroom@byu.edu" },
    { name: "Pre-Med Association", description: "Supporting pre-medical students with study groups, hospital shadowing, MCAT prep, and medical school application guidance.", categoryId: catMap["Academic"], avatarInitials: "PMA", avatarColor: "#EF4444", contactEmail: "premed@byu.edu" },
    { name: "Entrepreneur Club", description: "Fostering the startup mindset through pitch competitions, mentorship from founders, and cross-disciplinary collaboration.", categoryId: catMap["Career & Professional"], avatarInitials: "EC", avatarColor: "#F59E0B", contactEmail: "entrepreneurs@byu.edu" },
    { name: "BYU Hiking & Outdoors", description: "Exploring Utah's incredible landscapes through weekly hikes, camping trips, and outdoor skill-building adventures.", categoryId: catMap["Sports & Fitness"], avatarInitials: "HO", avatarColor: "#22C55E", contactEmail: "hiking@byu.edu" },
    { name: "Culinary Arts Society", description: "Learning world cuisines, cooking techniques, and hosting food events that bring the BYU community together.", categoryId: catMap["Food & Cooking"], avatarInitials: "CAS", avatarColor: "#EC4899", contactEmail: "culinary@byu.edu" },
    { name: "LDS Business Society", description: "Connecting faith and professional life through speaker series, networking, and career development for LDS business students.", categoryId: catMap["Religion & Faith"], avatarInitials: "LBS", avatarColor: "#F59E0B", contactEmail: "lbs@byu.edu" },
  ]).returning();

  console.log(`Inserted ${clubs.length} clubs`);

  const clubMap: Record<string, number> = {};
  for (const c of clubs) clubMap[c.name] = c.id;

  const bldgIds = buildings.map(b => b.id);
  const now = new Date();
  const events: any[] = [];

  function futureDate(daysFromNow: number, hour: number, minute = 0) {
    const d = new Date(now);
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(hour, minute, 0, 0);
    return d;
  }
  function endDate(start: Date, durationHours: number) {
    return new Date(start.getTime() + durationHours * 60 * 60 * 1000);
  }

  // 40 events spread over 2 weeks
  const eventData = [
    // Today events - some happening soon
    { title: "Intro to Machine Learning", desc: "Learn ML fundamentals with hands-on Python examples using scikit-learn and real datasets.", start: futureDate(0, 14), duration: 2, bldg: 7, room: "B101", cat: catMap["Technology"], club: clubMap["BYU CS Society"], cap: 80, food: false, tags: ["ML", "Python", "workshop"] },
    { title: "Resume Workshop for CS Majors", desc: "Get personalized resume feedback from recruiters at top tech companies. Limited spots!", start: futureDate(0, 16), duration: 1.5, bldg: 4, room: "A201", cat: catMap["Career & Professional"], club: clubMap["BYU CS Society"], cap: 30, food: false, tags: ["career", "resume", "tech"] },
    { title: "International Food Festival", desc: "Taste dishes from 30+ countries prepared by BYU's international student community. Free for all!", start: futureDate(0, 11), duration: 3, bldg: 0, room: "Ballroom", cat: catMap["International"], club: clubMap["International Students Association"], cap: 300, food: true, tags: ["food", "culture", "international"] },
    { title: "Ballroom Dance Social", desc: "No experience needed! Learn basic waltz and tango steps in a fun, welcoming environment.", start: futureDate(0, 19), duration: 2, bldg: 9, room: "Main Floor", cat: catMap["Arts & Culture"], club: clubMap["BYU Ballroom Dance Club"], cap: 100, food: false, tags: ["dance", "social", "beginner"] },
    { title: "Pre-Med Study Session", desc: "Group MCAT prep with upper-division pre-med students. Bring your materials and questions.", start: futureDate(0, 15), duration: 3, bldg: 1, room: "4th Floor", cat: catMap["Academic"], club: clubMap["Pre-Med Association"], cap: 25, food: false, tags: ["MCAT", "study", "premed"] },
    // Tomorrow
    { title: "Startup Pitch Competition", desc: "Watch student entrepreneurs pitch their startup ideas to a panel of investors and win prizes.", start: futureDate(1, 18), duration: 2, bldg: 2, room: "B150", cat: catMap["Career & Professional"], club: clubMap["Entrepreneur Club"], cap: 120, food: true, tags: ["startup", "pitch", "business"] },
    { title: "BYU Trails: Rock Canyon Hike", desc: "Moderate 5-mile hike up Rock Canyon with stunning views of Utah Valley. Bring water and snacks.", start: futureDate(1, 8), duration: 4, bldg: 9, room: "Parking Lot A", cat: catMap["Sports & Fitness"], club: clubMap["BYU Hiking & Outdoors"], cap: 40, food: false, tags: ["hiking", "outdoors", "Rock Canyon"] },
    { title: "World Languages Debate Night", desc: "Debate hot topics in Spanish, French, Mandarin, or English. Open to all language levels!", start: futureDate(1, 19, 30), duration: 2, bldg: 3, room: "101", cat: catMap["Academic"], club: clubMap["Debate & Oratory Club"], cap: 50, food: false, tags: ["debate", "languages", "speaking"] },
    { title: "Ramen Workshop: Japanese Cuisine", desc: "Craft authentic tonkotsu ramen from scratch with our culinary instructors. Dinner included!", start: futureDate(1, 17), duration: 2.5, bldg: 0, room: "Kitchen Lab", cat: catMap["Food & Cooking"], club: clubMap["Culinary Arts Society"], cap: 20, food: true, tags: ["cooking", "Japanese", "ramen"] },
    { title: "LBS Speaker Series: Faith & Finance", desc: "Successful LDS entrepreneur discusses aligning personal values with business decisions. Q&A included.", start: futureDate(1, 12), duration: 1.5, bldg: 2, room: "Auditorium", cat: catMap["Religion & Faith"], club: clubMap["LDS Business Society"], cap: 200, food: false, tags: ["faith", "finance", "speaker"] },
    // Day 2
    { title: "Night Photography Walk", desc: "Explore campus after dark with long-exposure techniques. All camera levels welcome.", start: futureDate(2, 20), duration: 2, bldg: 0, room: "Main Entrance", cat: catMap["Arts & Culture"], club: clubMap["BYU Photography Society"], cap: 25, food: false, tags: ["photography", "night", "campus"] },
    { title: "Community Service Day", desc: "Help clean up local parks and trails. Gloves and bags provided. Lunch afterwards!", start: futureDate(2, 9), duration: 4, bldg: 8, room: "Lobby", cat: catMap["Service"], club: clubMap["BYU Service Club"], cap: 60, food: true, tags: ["service", "community", "outdoors"] },
    { title: "Investment 101", desc: "Introduction to stocks, ETFs, and crypto. No prior finance experience required.", start: futureDate(2, 17), duration: 2, bldg: 5, room: "3rd Floor", cat: catMap["Career & Professional"], club: clubMap["Finance & Investment Club"], cap: 45, food: false, tags: ["investing", "finance", "beginner"] },
    // Day 3
    { title: "Full Stack Web Dev Workshop", desc: "Build a complete web app from scratch using React, Node, and PostgreSQL in one afternoon.", start: futureDate(3, 14), duration: 4, bldg: 7, room: "Lab 205", cat: catMap["Technology"], club: clubMap["BYU CS Society"], cap: 35, food: true, tags: ["web dev", "React", "fullstack"] },
    { title: "ISA Cultural Night: Asia Edition", desc: "Experience music, dance, food, and traditions from across Asia in one incredible night.", start: futureDate(3, 18, 30), duration: 3, bldg: 9, room: "Main Floor", cat: catMap["International"], club: clubMap["International Students Association"], cap: 250, food: true, tags: ["culture", "Asia", "performance"] },
    { title: "Saturday Morning Yoga", desc: "Start your weekend right with an hour of yoga in the Richards Building gym. All levels welcome.", start: futureDate(3, 8), duration: 1, bldg: 8, room: "Gym Floor", cat: catMap["Sports & Fitness"], club: clubMap["BYU Hiking & Outdoors"], cap: 30, food: false, tags: ["yoga", "fitness", "morning"] },
    // Day 4
    { title: "Hospital Shadowing Info Session", desc: "Learn how to sign up for hospital shadowing opportunities at Utah Valley Hospital and others.", start: futureDate(4, 16), duration: 1, bldg: 3, room: "200", cat: catMap["Academic"], club: clubMap["Pre-Med Association"], cap: 40, food: false, tags: ["shadowing", "hospital", "premed"] },
    { title: "Networking Mixer: Business & Tech", desc: "Meet students across business and tech disciplines. Exchange ideas and build your professional network.", start: futureDate(4, 19), duration: 2, bldg: 2, room: "Lobby", cat: catMap["Career & Professional"], club: clubMap["Entrepreneur Club"], cap: 80, food: true, tags: ["networking", "professional", "mixer"] },
    // Day 5
    { title: "Modern Waltz Masterclass", desc: "Intensive 2-hour session on waltz technique taught by a former competitive champion.", start: futureDate(5, 15), duration: 2, bldg: 9, room: "Studio B", cat: catMap["Arts & Culture"], club: clubMap["BYU Ballroom Dance Club"], cap: 40, food: false, tags: ["waltz", "masterclass", "dance"] },
    { title: "Vegetarian Cooking Class", desc: "Explore plant-based cuisine with 5 quick, affordable, and delicious recipes you can make in your dorm.", start: futureDate(5, 17), duration: 2, bldg: 0, room: "Kitchen Lab", cat: catMap["Food & Cooking"], club: clubMap["Culinary Arts Society"], cap: 18, food: true, tags: ["vegetarian", "cooking", "healthy"] },
    // Day 6
    { title: "Mock Trial Competition", desc: "Experience the courtroom with a simulated trial. Perfect for pre-law and debate enthusiasts.", start: futureDate(6, 13), duration: 3, bldg: 3, room: "Moot Court", cat: catMap["Academic"], club: clubMap["Debate & Oratory Club"], cap: 60, food: false, tags: ["debate", "law", "competition"] },
    { title: "Charity Gala Planning Meeting", desc: "Help organize our biggest fundraiser of the year. Volunteers needed for logistics, décor, and food.", start: futureDate(6, 17), duration: 1.5, bldg: 0, room: "Meeting Room 3", cat: catMap["Service"], club: clubMap["BYU Service Club"], cap: 30, food: false, tags: ["gala", "fundraiser", "volunteer"] },
    // Day 7
    { title: "Stock Market Simulation Game", desc: "Compete against peers in a week-long stock market simulation with real-time data. Cash prizes!", start: futureDate(7, 12), duration: 1, bldg: 5, room: "200", cat: catMap["Career & Professional"], club: clubMap["Finance & Investment Club"], cap: 50, food: false, tags: ["stocks", "competition", "finance"] },
    { title: "AI Ethics Panel Discussion", desc: "A panel of CS faculty and students debate the ethical implications of AI in society.", start: futureDate(7, 17), duration: 2, bldg: 7, room: "Auditorium", cat: catMap["Technology"], club: clubMap["BYU CS Society"], cap: 150, food: false, tags: ["AI", "ethics", "panel"] },
    { title: "Timpanogos Cave Day Trip", desc: "Guided tour of the spectacular Timpanogos Cave National Monument. Transportation provided!", start: futureDate(7, 7), duration: 8, bldg: 9, room: "Bus Pickup", cat: catMap["Sports & Fitness"], club: clubMap["BYU Hiking & Outdoors"], cap: 25, food: true, tags: ["cave", "hiking", "day trip"] },
    // Day 8
    { title: "Portrait Photography Workshop", desc: "Learn professional portrait lighting and posing techniques. Models provided.", start: futureDate(8, 14), duration: 3, bldg: 4, room: "Studio", cat: catMap["Arts & Culture"], club: clubMap["BYU Photography Society"], cap: 20, food: false, tags: ["portrait", "photography", "lighting"] },
    { title: "Faith & Career: Finding Your Purpose", desc: "A candid conversation about integrating faith principles into professional career choices.", start: futureDate(8, 18), duration: 1.5, bldg: 2, room: "Auditorium", cat: catMap["Religion & Faith"], club: clubMap["LDS Business Society"], cap: 180, food: false, tags: ["faith", "career", "purpose"] },
    // Day 9
    { title: "Global Health Crisis Simulation", desc: "Participate in a realistic public health simulation responding to a fictional pandemic scenario.", start: futureDate(9, 13), duration: 4, bldg: 3, room: "B200", cat: catMap["Academic"], club: clubMap["Pre-Med Association"], cap: 35, food: false, tags: ["public health", "simulation", "global"] },
    { title: "Tango Beginners Workshop", desc: "Learn the passionate Argentine tango from a certified instructor. No partner needed to sign up!", start: futureDate(9, 19), duration: 2, bldg: 9, room: "Studio A", cat: catMap["Arts & Culture"], club: clubMap["BYU Ballroom Dance Club"], cap: 50, food: false, tags: ["tango", "beginner", "dance"] },
    // Day 10
    { title: "International Trivia Night", desc: "Test your knowledge of world cultures, languages, and geography. Teams of 4, prizes for top 3!", start: futureDate(10, 19), duration: 2, bldg: 0, room: "Ballroom", cat: catMap["International"], club: clubMap["International Students Association"], cap: 120, food: true, tags: ["trivia", "international", "social"] },
    { title: "Hackathon Kickoff 2025", desc: "48-hour hackathon starting now. Build something awesome with a team. Mentors and meals provided.", start: futureDate(10, 18), duration: 2, bldg: 7, room: "CS Building", cat: catMap["Technology"], club: clubMap["BYU CS Society"], cap: 100, food: true, tags: ["hackathon", "coding", "competition"] },
    // Day 11
    { title: "Feeding the Homeless Drive", desc: "Help prepare and distribute meals at the Provo City Center. Transportation from campus provided.", start: futureDate(11, 10), duration: 4, bldg: 8, room: "Main Entrance", cat: catMap["Service"], club: clubMap["BYU Service Club"], cap: 40, food: false, tags: ["service", "homeless", "Provo"] },
    { title: "Crypto & Blockchain 101", desc: "Demystify cryptocurrency and blockchain technology with a technical but accessible workshop.", start: futureDate(11, 16), duration: 2, bldg: 5, room: "305", cat: catMap["Career & Professional"], club: clubMap["Finance & Investment Club"], cap: 60, food: false, tags: ["crypto", "blockchain", "workshop"] },
    // Day 12
    { title: "French & Italian Cuisine Night", desc: "Cook classic dishes like bouillabaisse and risotto. Wine-free pairing alternatives included!", start: futureDate(12, 17), duration: 3, bldg: 0, room: "Kitchen Lab", cat: catMap["Food & Cooking"], club: clubMap["Culinary Arts Society"], cap: 20, food: true, tags: ["French", "Italian", "cooking"] },
    { title: "Entrepreneurship Bootcamp Day 1", desc: "Intensive 3-day bootcamp on building a startup from idea to MVP. Registration required.", start: futureDate(12, 9), duration: 7, bldg: 2, room: "B150", cat: catMap["Career & Professional"], club: clubMap["Entrepreneur Club"], cap: 30, food: true, tags: ["bootcamp", "startup", "MVP"] },
    // Day 13
    { title: "Mountain Bike Skills Clinic", desc: "Learn essential mountain biking techniques on trails around Provo. Bikes available for rent.", start: futureDate(13, 9), duration: 4, bldg: 9, room: "Parking Lot B", cat: catMap["Sports & Fitness"], club: clubMap["BYU Hiking & Outdoors"], cap: 20, food: false, tags: ["biking", "mountain bike", "outdoor"] },
    { title: "Senior Portrait Exhibition", desc: "Annual showcase of senior photography students' best work. Reception with light refreshments.", start: futureDate(13, 16), duration: 3, bldg: 1, room: "Gallery", cat: catMap["Arts & Culture"], club: clubMap["BYU Photography Society"], cap: 80, food: true, tags: ["exhibition", "photography", "art"] },
    // Day 14
    { title: "Career Fair Prep Workshop", desc: "Polish your elevator pitch, review your resume, and practice interviewing before the big career fair.", start: futureDate(14, 14), duration: 2, bldg: 2, room: "A100", cat: catMap["Career & Professional"], club: clubMap["LDS Business Society"], cap: 60, food: false, tags: ["career fair", "interview", "prep"] },
    { title: "Medical Ethics Forum", desc: "Faculty and students discuss real-world ethical dilemmas in modern medicine. Open forum format.", start: futureDate(14, 16), duration: 2, bldg: 3, room: "B300", cat: catMap["Academic"], club: clubMap["Pre-Med Association"], cap: 80, food: false, tags: ["ethics", "medicine", "forum"] },
    { title: "Great Wall Chinese Cooking", desc: "Master Peking duck, dim sum, and other Chinese classics with our expert culinary instructor.", start: futureDate(14, 17, 30), duration: 2.5, bldg: 0, room: "Kitchen Lab", cat: catMap["Food & Cooking"], club: clubMap["Culinary Arts Society"], cap: 16, food: true, tags: ["Chinese", "cooking", "dim sum"] },
  ];

  for (const e of eventData) {
    const startTime = e.start;
    const endTime = endDate(startTime, e.duration);
    const bldg = buildings[e.bldg];

    events.push({
      title: e.title,
      description: e.desc,
      startTime,
      endTime,
      buildingId: bldg.id,
      roomNumber: e.room,
      categoryId: e.cat,
      clubId: e.club,
      capacity: e.cap,
      hasFood: e.food,
      tags: e.tags,
    });
  }

  await db.insert(eventsTable).values(events);
  console.log(`Inserted ${events.length} events`);

  // Announcements
  await db.insert(announcementsTable).values([
    { clubId: clubMap["BYU CS Society"], title: "New semester, new projects!", body: "We're kicking off the semester with exciting new projects. Join us at our first meeting to learn more about web dev, AI, and game dev tracks." },
    { clubId: clubMap["BYU CS Society"], title: "Hackathon registration open", body: "Sign up now for our 48-hour hackathon next week. Teams of 1-4, all skill levels welcome. Prizes up to $500!" },
    { clubId: clubMap["International Students Association"], title: "Cultural Night planning meeting", body: "We need volunteers for our upcoming Asia Cultural Night. Come share your culture and help make it a success!" },
    { clubId: clubMap["BYU Service Club"], title: "Service opportunities this week", body: "Multiple service opportunities available this week at the food bank, animal shelter, and local schools. Sign up on our website." },
    { clubId: clubMap["Pre-Med Association"], title: "MCAT prep resources updated", body: "We've updated our shared study drive with new MCAT prep materials including Anki decks and practice passages." },
    { clubId: clubMap["Entrepreneur Club"], title: "Pitch competition judges announced", body: "We're thrilled to announce our panel of judges for next week's startup pitch competition, including founders of two Utah unicorns!" },
    { clubId: clubMap["BYU Hiking & Outdoors"], title: "Trail conditions report", body: "Y Mountain trail is in great condition. The slot canyon trail is still closed due to flooding. Check our website for weekly updates." },
    { clubId: clubMap["BYU Ballroom Dance Club"], title: "Showcase tryouts this Friday", body: "Want to perform in our spring showcase? Tryouts are this Friday at 7pm. All styles and levels are encouraged to audition." },
    { clubId: clubMap["Finance & Investment Club"], title: "Stock market sim results", body: "Congratulations to team 'Bull Market' for winning our fall stock simulation with a 47% return! Spring competition starts soon." },
    { clubId: clubMap["Culinary Arts Society"], title: "Kitchen equipment update", body: "We just received a new set of carbon steel woks and high-BTU burners. Get ready for serious Asian cooking classes!" },
  ]);

  console.log("Seeding complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
