-- KEYS[1] = OTP wali key (jisme actual OTP stored hai)
-- KEYS[2] = attempts counter wali key (kitni baar galat try hui)
-- ARGV[1] = user ne jo OTP bheja hai
-- ARGV[2] = max allowed attempts (jaise 5)
-- ARGV[3] = attempts key ka TTL seconds me (OTP jitna hi, jaise 120)

local storedOtp = redis.call('GET', KEYS[1])

-- OTP key hi nahi mili, matlab expire ho chuka ya kabhi maanga hi nahi
if not storedOtp then
    return 'EXPIRED'
end

-- Attempt counter ko atomically badhao. INCR khud hi atomic hai Redis me,
-- aur poora script bhi ek unit ki tarah chalta hai - isliye parallel
-- requests ke beech koi race nahi ho sakti ab.
local attempts = redis.call('INCR', KEYS[2])

-- Pehli baar counter bana hai (value 1 aayi), toh usko expiry do
-- warna yeh key hamesha ke liye Redis me reh jaayegi
if attempts == 1 then
    redis.call('EXPIRE', KEYS[2], ARGV[3])
end

-- Limit cross ho gayi - OTP ko turant invalidate kar do, taaki
-- attacker ko aur try karne ka mauka hi na mile
if attempts > tonumber(ARGV[2]) then
    redis.call('DEL', KEYS[1])
    return 'LOCKED'
end

-- Ab asli comparison - sahi OTP hai ya nahi
if storedOtp == ARGV[1] then
    redis.call('DEL', KEYS[2])   -- success hua, attempt counter ki zaroorat nahi ab
    return 'OK'
else
    return 'WRONG'
end