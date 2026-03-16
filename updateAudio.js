const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://lsvhmvkhernimxmzcyak.supabase.co',
  'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc'
);

const updates = [
  {
    "date": "2026-01-01",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/1.mp3"
  },
  {
    "date": "2026-01-02",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/2.mp3"
  },
  {
    "date": "2026-01-03",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/3.mp3"
  },
  {
    "date": "2026-01-04",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/4.mp3"
  },
  {
    "date": "2026-01-05",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/5.mp3"
  },
  {
    "date": "2026-01-06",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/5.mp3"
  },
  {
    "date": "2026-01-07",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/6.mp3"
  },
  {
    "date": "2026-01-08",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/7.mp3"
  },
  {
    "date": "2026-01-09",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/8.mp3"
  },
  {
    "date": "2026-01-10",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/8.mp3"
  },
  {
    "date": "2026-01-11",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/9.mp3"
  },
  {
    "date": "2026-01-12",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/9.mp3"
  },
  {
    "date": "2026-01-13",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/10.mp3"
  },
  {
    "date": "2026-01-14",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/11.mp3"
  },
  {
    "date": "2026-01-15",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/12.mp3"
  },
  {
    "date": "2026-01-16",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/12.mp3"
  },
  {
    "date": "2026-01-17",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/13.mp3"
  },
  {
    "date": "2026-01-18",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/13.mp3"
  },
  {
    "date": "2026-01-19",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/14.mp3"
  },
  {
    "date": "2026-01-20",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/14.mp3"
  },
  {
    "date": "2026-01-21",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/15.mp3"
  },
  {
    "date": "2026-01-22",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/16.mp3"
  },
  {
    "date": "2026-01-23",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/16.mp3"
  },
  {
    "date": "2026-01-24",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/17.mp3"
  },
  {
    "date": "2026-01-25",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/18.mp3"
  },
  {
    "date": "2026-01-26",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/19.mp3"
  },
  {
    "date": "2026-01-27",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/20.mp3"
  },
  {
    "date": "2026-01-28",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/20.mp3"
  },
  {
    "date": "2026-01-29",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/21.mp3"
  },
  {
    "date": "2026-01-30",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/21.mp3"
  },
  {
    "date": "2026-01-31",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/22.mp3"
  },
  {
    "date": "2026-02-01",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/22.mp3"
  },
  {
    "date": "2026-02-02",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/23.mp3"
  },
  {
    "date": "2026-02-03",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/24.mp3"
  },
  {
    "date": "2026-02-04",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/24.mp3"
  },
  {
    "date": "2026-02-05",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/25.mp3"
  },
  {
    "date": "2026-02-06",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/25.mp3"
  },
  {
    "date": "2026-02-07",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/26.mp3"
  },
  {
    "date": "2026-02-08",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/26.mp3"
  },
  {
    "date": "2026-02-09",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/26.mp3"
  },
  {
    "date": "2026-02-10",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/27.mp3"
  },
  {
    "date": "2026-02-11",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/27.mp3"
  },
  {
    "date": "2026-02-12",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/27.mp3"
  },
  {
    "date": "2026-02-13",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-matthew/28.mp3"
  },
  {
    "date": "2026-02-14",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/1.mp3"
  },
  {
    "date": "2026-02-15",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/1.mp3"
  },
  {
    "date": "2026-02-16",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/1.mp3"
  },
  {
    "date": "2026-02-17",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/2.mp3"
  },
  {
    "date": "2026-02-18",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/3.mp3"
  },
  {
    "date": "2026-02-19",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/4.mp3"
  },
  {
    "date": "2026-02-20",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/4.mp3"
  },
  {
    "date": "2026-02-21",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/5.mp3"
  },
  {
    "date": "2026-02-22",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/5.mp3"
  },
  {
    "date": "2026-02-23",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/6.mp3"
  },
  {
    "date": "2026-02-24",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/6.mp3"
  },
  {
    "date": "2026-02-25",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/7.mp3"
  },
  {
    "date": "2026-02-26",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/8.mp3"
  },
  {
    "date": "2026-02-27",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/9.mp3"
  },
  {
    "date": "2026-02-28",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/9.mp3"
  },
  {
    "date": "2026-03-01",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/9.mp3"
  },
  {
    "date": "2026-03-02",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/10.mp3"
  },
  {
    "date": "2026-03-03",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/10.mp3"
  },
  {
    "date": "2026-03-04",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/11.mp3"
  },
  {
    "date": "2026-03-05",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/11.mp3"
  },
  {
    "date": "2026-03-06",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/12.mp3"
  },
  {
    "date": "2026-03-07",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/13.mp3"
  },
  {
    "date": "2026-03-08",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/14.mp3"
  },
  {
    "date": "2026-03-09",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/14.mp3"
  },
  {
    "date": "2026-03-10",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/14.mp3"
  },
  {
    "date": "2026-03-11",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/14.mp3"
  },
  {
    "date": "2026-03-12",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/15.mp3"
  },
  {
    "date": "2026-03-13",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/15.mp3"
  },
  {
    "date": "2026-03-14",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-Mark/16.mp3"
  },
  {
    "date": "2026-03-15",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/1.mp3"
  },
  {
    "date": "2026-03-16",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/1.mp3"
  },
  {
    "date": "2026-03-17",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/1.mp3"
  },
  {
    "date": "2026-03-18",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/2.mp3"
  },
  {
    "date": "2026-03-19",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/2.mp3"
  },
  {
    "date": "2026-03-20",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/3.mp3"
  },
  {
    "date": "2026-03-21",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/3.mp3"
  },
  {
    "date": "2026-03-22",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/4.mp3"
  },
  {
    "date": "2026-03-23",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/4.mp3"
  },
  {
    "date": "2026-03-24",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/4.mp3"
  },
  {
    "date": "2026-03-25",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/5.mp3"
  },
  {
    "date": "2026-03-26",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/5.mp3"
  },
  {
    "date": "2026-03-27",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/6.mp3"
  },
  {
    "date": "2026-03-28",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/6.mp3"
  },
  {
    "date": "2026-03-29",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/7.mp3"
  },
  {
    "date": "2026-03-30",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/7.mp3"
  },
  {
    "date": "2026-03-31",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/8.mp3"
  },
  {
    "date": "2026-04-01",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/8.mp3"
  },
  {
    "date": "2026-04-02",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/9.mp3"
  },
  {
    "date": "2026-04-03",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/9.mp3"
  },
  {
    "date": "2026-04-04",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/9.mp3"
  },
  {
    "date": "2026-04-05",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/9.mp3"
  },
  {
    "date": "2026-04-06",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/10.mp3"
  },
  {
    "date": "2026-04-07",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/10.mp3"
  },
  {
    "date": "2026-04-08",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/11.mp3"
  },
  {
    "date": "2026-04-09",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/11.mp3"
  },
  {
    "date": "2026-04-10",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/11.mp3"
  },
  {
    "date": "2026-04-11",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/12.mp3"
  },
  {
    "date": "2026-04-12",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/12.mp3"
  },
  {
    "date": "2026-04-13",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/12.mp3"
  },
  {
    "date": "2026-04-14",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/13.mp3"
  },
  {
    "date": "2026-04-15",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/13.mp3"
  },
  {
    "date": "2026-04-16",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/14.mp3"
  },
  {
    "date": "2026-04-17",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/14.mp3"
  },
  {
    "date": "2026-04-18",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/15.mp3"
  },
  {
    "date": "2026-04-19",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/16.mp3"
  },
  {
    "date": "2026-04-20",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/16.mp3"
  },
  {
    "date": "2026-04-21",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/17.mp3"
  },
  {
    "date": "2026-04-22",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/18.mp3"
  },
  {
    "date": "2026-04-23",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/18.mp3"
  },
  {
    "date": "2026-04-24",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/19.mp3"
  },
  {
    "date": "2026-04-25",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/19.mp3"
  },
  {
    "date": "2026-04-26",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/20.mp3"
  },
  {
    "date": "2026-04-27",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/20.mp3"
  },
  {
    "date": "2026-04-28",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/21.mp3"
  },
  {
    "date": "2026-04-29",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/21.mp3"
  },
  {
    "date": "2026-04-30",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/22.mp3"
  },
  {
    "date": "2026-05-01",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/22.mp3"
  },
  {
    "date": "2026-05-02",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/23.mp3"
  },
  {
    "date": "2026-05-03",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/23.mp3"
  },
  {
    "date": "2026-05-04",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/24.mp3"
  },
  {
    "date": "2026-05-05",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/24.mp3"
  },
  {
    "date": "2026-05-06",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-luke/24.mp3"
  },
  {
    "date": "2026-05-07",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/1.mp3"
  },
  {
    "date": "2026-05-08",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/1.mp3"
  },
  {
    "date": "2026-05-09",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/2.mp3"
  },
  {
    "date": "2026-05-10",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/2.mp3"
  },
  {
    "date": "2026-05-11",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/3.mp3"
  },
  {
    "date": "2026-05-12",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/4.mp3"
  },
  {
    "date": "2026-05-13",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/4.mp3"
  },
  {
    "date": "2026-05-14",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/4.mp3"
  },
  {
    "date": "2026-05-15",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/5.mp3"
  },
  {
    "date": "2026-05-16",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/5.mp3"
  },
  {
    "date": "2026-05-17",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/6.mp3"
  },
  {
    "date": "2026-05-18",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/6.mp3"
  },
  {
    "date": "2026-05-19",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/6.mp3"
  },
  {
    "date": "2026-05-20",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/7.mp3"
  },
  {
    "date": "2026-05-21",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/7.mp3"
  },
  {
    "date": "2026-05-22",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/7.mp3"
  },
  {
    "date": "2026-05-23",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/8.mp3"
  },
  {
    "date": "2026-05-24",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/9.mp3"
  },
  {
    "date": "2026-05-25",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/9.mp3"
  },
  {
    "date": "2026-05-26",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/10.mp3"
  },
  {
    "date": "2026-05-27",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/10.mp3"
  },
  {
    "date": "2026-05-28",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/11.mp3"
  },
  {
    "date": "2026-05-29",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/11.mp3"
  },
  {
    "date": "2026-05-30",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/12.mp3"
  },
  {
    "date": "2026-05-31",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/12.mp3"
  },
  {
    "date": "2026-06-01",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/13.mp3"
  },
  {
    "date": "2026-06-02",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/13.mp3"
  },
  {
    "date": "2026-06-03",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/14.mp3"
  },
  {
    "date": "2026-06-04",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/15.mp3"
  },
  {
    "date": "2026-06-05",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/16.mp3"
  },
  {
    "date": "2026-06-06",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/17.mp3"
  },
  {
    "date": "2026-06-07",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/18.mp3"
  },
  {
    "date": "2026-06-08",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/18.mp3"
  },
  {
    "date": "2026-06-09",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/19.mp3"
  },
  {
    "date": "2026-06-10",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/20.mp3"
  },
  {
    "date": "2026-06-11",
    "nt_audio": "https://bibleread.online/audio/bible/the-gospel-according-to-john/21.mp3"
  },
  {
    "date": "2026-06-12",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/1.mp3"
  },
  {
    "date": "2026-06-13",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/1.mp3"
  },
  {
    "date": "2026-06-14",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/2.mp3"
  },
  {
    "date": "2026-06-15",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/2.mp3"
  },
  {
    "date": "2026-06-16",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/3.mp3"
  },
  {
    "date": "2026-06-17",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/4.mp3"
  },
  {
    "date": "2026-06-18",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/4.mp3"
  },
  {
    "date": "2026-06-19",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/4.mp3"
  },
  {
    "date": "2026-06-20",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/5.mp3"
  },
  {
    "date": "2026-06-21",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/5.mp3"
  },
  {
    "date": "2026-06-22",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/6.mp3"
  },
  {
    "date": "2026-06-23",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/7.mp3"
  },
  {
    "date": "2026-06-24",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/7.mp3"
  },
  {
    "date": "2026-06-25",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/8.mp3"
  },
  {
    "date": "2026-06-26",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/8.mp3"
  },
  {
    "date": "2026-06-27",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/9.mp3"
  },
  {
    "date": "2026-06-28",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/9.mp3"
  },
  {
    "date": "2026-06-29",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/10.mp3"
  },
  {
    "date": "2026-06-30",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/10.mp3"
  },
  {
    "date": "2026-07-01",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/11.mp3"
  },
  {
    "date": "2026-07-02",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/11.mp3"
  },
  {
    "date": "2026-07-03",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/12.mp3"
  },
  {
    "date": "2026-07-04",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/12.mp3"
  },
  {
    "date": "2026-07-05",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/13.mp3"
  },
  {
    "date": "2026-07-06",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/14.mp3"
  },
  {
    "date": "2026-07-07",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/15.mp3"
  },
  {
    "date": "2026-07-08",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/15.mp3"
  },
  {
    "date": "2026-07-09",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/16.mp3"
  },
  {
    "date": "2026-07-10",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/17.mp3"
  },
  {
    "date": "2026-07-11",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/18.mp3"
  },
  {
    "date": "2026-07-12",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/18.mp3"
  },
  {
    "date": "2026-07-13",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/19.mp3"
  },
  {
    "date": "2026-07-14",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/20.mp3"
  },
  {
    "date": "2026-07-15",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/20.mp3"
  },
  {
    "date": "2026-07-16",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/21.mp3"
  },
  {
    "date": "2026-07-17",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/21.mp3"
  },
  {
    "date": "2026-07-18",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/21.mp3"
  },
  {
    "date": "2026-07-19",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/22.mp3"
  },
  {
    "date": "2026-07-20",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/23.mp3"
  },
  {
    "date": "2026-07-21",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/24.mp3"
  },
  {
    "date": "2026-07-22",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/25.mp3"
  },
  {
    "date": "2026-07-23",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/26.mp3"
  },
  {
    "date": "2026-07-24",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/27.mp3"
  },
  {
    "date": "2026-07-25",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/27.mp3"
  },
  {
    "date": "2026-07-26",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/28.mp3"
  },
  {
    "date": "2026-07-27",
    "nt_audio": "https://bibleread.online/audio/bible/the-acts-of-the-apostles/28.mp3"
  },
  {
    "date": "2026-07-28",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-romans/1.mp3"
  },
  {
    "date": "2026-07-29",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-romans/1.mp3"
  },
  {
    "date": "2026-07-30",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-romans/2.mp3"
  },
  {
    "date": "2026-07-31",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-romans/2.mp3"
  },
  {
    "date": "2026-08-01",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-romans/3.mp3"
  },
  {
    "date": "2026-08-02",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-romans/4.mp3"
  },
  {
    "date": "2026-08-03",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-romans/5.mp3"
  },
  {
    "date": "2026-08-04",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-romans/5.mp3"
  },
  {
    "date": "2026-08-05",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-romans/6.mp3"
  },
  {
    "date": "2026-08-06",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-romans/7.mp3"
  },
  {
    "date": "2026-08-07",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-romans/8.mp3"
  },
  {
    "date": "2026-08-08",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-romans/8.mp3"
  },
  {
    "date": "2026-08-09",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-romans/9.mp3"
  },
  {
    "date": "2026-08-10",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-romans/9.mp3"
  },
  {
    "date": "2026-08-11",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-romans/10.mp3"
  },
  {
    "date": "2026-08-12",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-romans/11.mp3"
  },
  {
    "date": "2026-08-13",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-romans/11.mp3"
  },
  {
    "date": "2026-08-14",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-romans/12.mp3"
  },
  {
    "date": "2026-08-15",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-romans/13.mp3"
  },
  {
    "date": "2026-08-16",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-romans/14.mp3"
  },
  {
    "date": "2026-08-17",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-romans/15.mp3"
  },
  {
    "date": "2026-08-18",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-corinthians/1.mp3"
  },
  {
    "date": "2026-08-19",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-corinthians/1.mp3"
  },
  {
    "date": "2026-08-20",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-corinthians/2.mp3"
  },
  {
    "date": "2026-08-21",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-corinthians/3.mp3"
  },
  {
    "date": "2026-08-22",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-corinthians/4.mp3"
  },
  {
    "date": "2026-08-23",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-corinthians/5.mp3"
  },
  {
    "date": "2026-08-24",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-corinthians/6.mp3"
  },
  {
    "date": "2026-08-25",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-corinthians/7.mp3"
  },
  {
    "date": "2026-08-26",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-corinthians/7.mp3"
  },
  {
    "date": "2026-08-27",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-corinthians/8.mp3"
  },
  {
    "date": "2026-08-28",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-corinthians/9.mp3"
  },
  {
    "date": "2026-08-29",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-corinthians/10.mp3"
  },
  {
    "date": "2026-08-30",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-corinthians/11.mp3"
  },
  {
    "date": "2026-08-31",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-corinthians/12.mp3"
  },
  {
    "date": "2026-09-01",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-corinthians/13.mp3"
  },
  {
    "date": "2026-09-02",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-corinthians/14.mp3"
  },
  {
    "date": "2026-09-03",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-corinthians/14.mp3"
  },
  {
    "date": "2026-09-04",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-corinthians/15.mp3"
  },
  {
    "date": "2026-09-05",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-corinthians/15.mp3"
  },
  {
    "date": "2026-09-06",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-corinthians/16.mp3"
  },
  {
    "date": "2026-09-07",
    "nt_audio": "https://bibleread.online/audio/bible/the-second-epistle-of-paul-to-the-corinthians/1.mp3"
  },
  {
    "date": "2026-09-08",
    "nt_audio": "https://bibleread.online/audio/bible/the-second-epistle-of-paul-to-the-corinthians/2.mp3"
  },
  {
    "date": "2026-09-09",
    "nt_audio": "https://bibleread.online/audio/bible/the-second-epistle-of-paul-to-the-corinthians/3.mp3"
  },
  {
    "date": "2026-09-10",
    "nt_audio": "https://bibleread.online/audio/bible/the-second-epistle-of-paul-to-the-corinthians/4.mp3"
  },
  {
    "date": "2026-09-11",
    "nt_audio": "https://bibleread.online/audio/bible/the-second-epistle-of-paul-to-the-corinthians/5.mp3"
  },
  {
    "date": "2026-09-12",
    "nt_audio": "https://bibleread.online/audio/bible/the-second-epistle-of-paul-to-the-corinthians/6.mp3"
  },
  {
    "date": "2026-09-13",
    "nt_audio": "https://bibleread.online/audio/bible/the-second-epistle-of-paul-to-the-corinthians/8.mp3"
  },
  {
    "date": "2026-09-14",
    "nt_audio": "https://bibleread.online/audio/bible/the-second-epistle-of-paul-to-the-corinthians/9.mp3"
  },
  {
    "date": "2026-09-15",
    "nt_audio": "https://bibleread.online/audio/bible/the-second-epistle-of-paul-to-the-corinthians/10.mp3"
  },
  {
    "date": "2026-09-16",
    "nt_audio": "https://bibleread.online/audio/bible/the-second-epistle-of-paul-to-the-corinthians/11.mp3"
  },
  {
    "date": "2026-09-17",
    "nt_audio": "https://bibleread.online/audio/bible/the-second-epistle-of-paul-to-the-corinthians/12.mp3"
  },
  {
    "date": "2026-09-18",
    "nt_audio": "https://bibleread.online/audio/bible/the-second-epistle-of-paul-to-the-corinthians/12.mp3"
  },
  {
    "date": "2026-09-19",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-galatians/1.mp3"
  },
  {
    "date": "2026-09-20",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-galatians/2.mp3"
  },
  {
    "date": "2026-09-21",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-galatians/3.mp3"
  },
  {
    "date": "2026-09-22",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-galatians/4.mp3"
  },
  {
    "date": "2026-09-23",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-galatians/5.mp3"
  },
  {
    "date": "2026-09-24",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-galatians/5.mp3"
  },
  {
    "date": "2026-09-25",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-ephesians/1.mp3"
  },
  {
    "date": "2026-09-26",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-ephesians/2.mp3"
  },
  {
    "date": "2026-09-27",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-ephesians/3.mp3"
  },
  {
    "date": "2026-09-28",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-ephesians/4.mp3"
  },
  {
    "date": "2026-09-29",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-ephesians/4.mp3"
  },
  {
    "date": "2026-09-30",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-ephesians/5.mp3"
  },
  {
    "date": "2026-10-01",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-philippians/1.mp3"
  },
  {
    "date": "2026-10-02",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-philippians/1.mp3"
  },
  {
    "date": "2026-10-03",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-philippians/2.mp3"
  },
  {
    "date": "2026-10-04",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-philippians/3.mp3"
  },
  {
    "date": "2026-10-05",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-philippians/4.mp3"
  },
  {
    "date": "2026-10-06",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-colossians/1.mp3"
  },
  {
    "date": "2026-10-07",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-colossians/1.mp3"
  },
  {
    "date": "2026-10-08",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-colossians/2.mp3"
  },
  {
    "date": "2026-10-09",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-colossians/3.mp3"
  },
  {
    "date": "2026-10-10",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-colossians/3.mp3"
  },
  {
    "date": "2026-10-11",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-the-colossians/4.mp3"
  },
  {
    "date": "2026-10-12",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-thessalonians/1.mp3"
  },
  {
    "date": "2026-10-13",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-thessalonians/2.mp3"
  },
  {
    "date": "2026-10-14",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-thessalonians/3.mp3"
  },
  {
    "date": "2026-10-15",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-thessalonians/4.mp3"
  },
  {
    "date": "2026-10-16",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-the-thessalonians/5.mp3"
  },
  {
    "date": "2026-10-17",
    "nt_audio": "https://bibleread.online/audio/bible/the-second-epistle-of-paul-to-the-thessalonians/1.mp3"
  },
  {
    "date": "2026-10-18",
    "nt_audio": "https://bibleread.online/audio/bible/the-second-epistle-of-paul-to-the-thessalonians/2.mp3"
  },
  {
    "date": "2026-10-19",
    "nt_audio": "https://bibleread.online/audio/bible/the-second-epistle-of-paul-to-the-thessalonians/3.mp3"
  },
  {
    "date": "2026-10-20",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-timothy/1.mp3"
  },
  {
    "date": "2026-10-21",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-timothy/2.mp3"
  },
  {
    "date": "2026-10-22",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-timothy/3.mp3"
  },
  {
    "date": "2026-10-23",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-timothy/4.mp3"
  },
  {
    "date": "2026-10-24",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-timothy/5.mp3"
  },
  {
    "date": "2026-10-25",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-paul-to-timothy/6.mp3"
  },
  {
    "date": "2026-10-26",
    "nt_audio": "https://bibleread.online/audio/bible/the-sescond-epistle-of-paul-to-timothy/1.mp3"
  },
  {
    "date": "2026-10-27",
    "nt_audio": "https://bibleread.online/audio/bible/the-sescond-epistle-of-paul-to-timothy/2.mp3"
  },
  {
    "date": "2026-10-28",
    "nt_audio": "https://bibleread.online/audio/bible/the-sescond-epistle-of-paul-to-timothy/3.mp3"
  },
  {
    "date": "2026-10-29",
    "nt_audio": "https://bibleread.online/audio/bible/the-sescond-epistle-of-paul-to-timothy/4.mp3"
  },
  {
    "date": "2026-10-30",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-titus/1.mp3"
  },
  {
    "date": "2026-10-31",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-titus/2.mp3"
  },
  {
    "date": "2026-11-01",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-titus/3.mp3"
  },
  {
    "date": "2026-11-02",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-paul-to-philemon/1.mp3"
  },
  {
    "date": "2026-11-03",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-to-the-hebrews/1.mp3"
  },
  {
    "date": "2026-11-04",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-to-the-hebrews/2.mp3"
  },
  {
    "date": "2026-11-05",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-to-the-hebrews/3.mp3"
  },
  {
    "date": "2026-11-06",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-to-the-hebrews/4.mp3"
  },
  {
    "date": "2026-11-07",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-to-the-hebrews/5.mp3"
  },
  {
    "date": "2026-11-08",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-to-the-hebrews/7.mp3"
  },
  {
    "date": "2026-11-09",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-to-the-hebrews/8.mp3"
  },
  {
    "date": "2026-11-10",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-to-the-hebrews/9.mp3"
  },
  {
    "date": "2026-11-11",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-to-the-hebrews/10.mp3"
  },
  {
    "date": "2026-11-12",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-to-the-hebrews/11.mp3"
  },
  {
    "date": "2026-11-13",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-to-the-hebrews/12.mp3"
  },
  {
    "date": "2026-11-14",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-to-the-hebrews/13.mp3"
  },
  {
    "date": "2026-11-15",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-james/1.mp3"
  },
  {
    "date": "2026-11-16",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-james/1.mp3"
  },
  {
    "date": "2026-11-17",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-james/2.mp3"
  },
  {
    "date": "2026-11-18",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-james/2.mp3"
  },
  {
    "date": "2026-11-19",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-james/3.mp3"
  },
  {
    "date": "2026-11-20",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-james/4.mp3"
  },
  {
    "date": "2026-11-21",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-james/5.mp3"
  },
  {
    "date": "2026-11-22",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-peter/1.mp3"
  },
  {
    "date": "2026-11-23",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-peter/1.mp3"
  },
  {
    "date": "2026-11-24",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-peter/2.mp3"
  },
  {
    "date": "2026-11-25",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-peter/2.mp3"
  },
  {
    "date": "2026-11-26",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-peter/3.mp3"
  },
  {
    "date": "2026-11-27",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-peter/4.mp3"
  },
  {
    "date": "2026-11-28",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-peter/5.mp3"
  },
  {
    "date": "2026-11-29",
    "nt_audio": "https://bibleread.online/audio/bible/the-second-epistle-of-peter/1.mp3"
  },
  {
    "date": "2026-11-30",
    "nt_audio": "https://bibleread.online/audio/bible/the-second-epistle-of-peter/1.mp3"
  },
  {
    "date": "2026-12-01",
    "nt_audio": "https://bibleread.online/audio/bible/the-second-epistle-of-peter/2.mp3"
  },
  {
    "date": "2026-12-02",
    "nt_audio": "https://bibleread.online/audio/bible/the-second-epistle-of-peter/3.mp3"
  },
  {
    "date": "2026-12-03",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-john/1.mp3"
  },
  {
    "date": "2026-12-04",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-john/2.mp3"
  },
  {
    "date": "2026-12-05",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-john/3.mp3"
  },
  {
    "date": "2026-12-06",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-john/4.mp3"
  },
  {
    "date": "2026-12-07",
    "nt_audio": "https://bibleread.online/audio/bible/the-first-epistle-of-john/5.mp3"
  },
  {
    "date": "2026-12-08",
    "nt_audio": "https://bibleread.online/audio/bible/the-second-epistle-of-john/1.mp3"
  },
  {
    "date": "2026-12-09",
    "nt_audio": "https://bibleread.online/audio/bible/the-third-epistle-of-john/1.mp3"
  },
  {
    "date": "2026-12-10",
    "nt_audio": "https://bibleread.online/audio/bible/the-epistle-of-jude/1.mp3"
  },
  {
    "date": "2026-12-11",
    "nt_audio": "https://bibleread.online/audio/bible/revelation/1.mp3"
  },
  {
    "date": "2026-12-12",
    "nt_audio": "https://bibleread.online/audio/bible/revelation/2.mp3"
  },
  {
    "date": "2026-12-13",
    "nt_audio": "https://bibleread.online/audio/bible/revelation/3.mp3"
  },
  {
    "date": "2026-12-14",
    "nt_audio": "https://bibleread.online/audio/bible/revelation/4.mp3"
  },
  {
    "date": "2026-12-15",
    "nt_audio": "https://bibleread.online/audio/bible/revelation/6.mp3"
  },
  {
    "date": "2026-12-16",
    "nt_audio": "https://bibleread.online/audio/bible/revelation/7.mp3"
  },
  {
    "date": "2026-12-17",
    "nt_audio": "https://bibleread.online/audio/bible/revelation/8.mp3"
  },
  {
    "date": "2026-12-18",
    "nt_audio": "https://bibleread.online/audio/bible/revelation/9.mp3"
  },
  {
    "date": "2026-12-19",
    "nt_audio": "https://bibleread.online/audio/bible/revelation/10.mp3"
  },
  {
    "date": "2026-12-20",
    "nt_audio": "https://bibleread.online/audio/bible/revelation/11.mp3"
  },
  {
    "date": "2026-12-21",
    "nt_audio": "https://bibleread.online/audio/bible/revelation/12.mp3"
  },
  {
    "date": "2026-12-22",
    "nt_audio": "https://bibleread.online/audio/bible/revelation/13.mp3"
  },
  {
    "date": "2026-12-23",
    "nt_audio": "https://bibleread.online/audio/bible/revelation/14.mp3"
  },
  {
    "date": "2026-12-24",
    "nt_audio": "https://bibleread.online/audio/bible/revelation/15.mp3"
  },
  {
    "date": "2026-12-25",
    "nt_audio": "https://bibleread.online/audio/bible/revelation/17.mp3"
  },
  {
    "date": "2026-12-26",
    "nt_audio": "https://bibleread.online/audio/bible/revelation/18.mp3"
  },
  {
    "date": "2026-12-27",
    "nt_audio": "https://bibleread.online/audio/bible/revelation/19.mp3"
  },
  {
    "date": "2026-12-28",
    "nt_audio": "https://bibleread.online/audio/bible/revelation/20.mp3"
  },
  {
    "date": "2026-12-29",
    "nt_audio": "https://bibleread.online/audio/bible/revelation/21.mp3"
  },
  {
    "date": "2026-12-30",
    "nt_audio": "https://bibleread.online/audio/bible/revelation/22.mp3"
  }
];

async function run() {
  console.log('Updating', updates.length, 'audio URLs...');
  for (const u of updates) {
    const { error } = await supabase.from('verses')
      .update({ nt_audio: u.nt_audio })
      .eq('date', u.date);
    if (error) console.error(u.date, error.message);
  }
  console.log('Done!');
}
run();
