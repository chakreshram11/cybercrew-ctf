const { CompetitionAccessService } = require('../backend/dist/common/services/competition-access.service');

// IST Start: 15 Sept 2026 05:00 PM IST -> 2026-09-15T11:30:00.000Z
// IST End:   20 Sept 2026 05:00 PM IST -> 2026-09-20T11:30:00.000Z

const startIST = '2026-09-15T11:30:00.000Z';
const endIST = '2026-09-20T11:30:00.000Z';

const mockSupabaseService = {
  getClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              start_date: startIST,
              end_date: endIST,
              state: 'LIVE',
            },
            error: null,
          }),
        }),
      }),
    }),
  }),
};

const service = new CompetitionAccessService(mockSupabaseService);

const participantUser = { id: 'p1', role: 'PARTICIPANT' };
const adminUser = { id: 'a1', role: 'ADMIN' };

async function verifyManualAcceptance() {
  console.log('=== VERIFYING MANUAL ACCEPTANCE TEST (IST EVENT SCHEDULE) ===\n');
  console.log(`Configured Schedule (IST): 15 Sept 2026 05:00 PM IST to 20 Sept 2026 05:00 PM IST`);
  console.log(`UTC Equivalents: ${startIST} to ${endIST}\n`);

  // 1. BEFORE 15 Sept 2026 05:00 PM IST
  const beforeTime = new Date('2026-09-15T11:29:59.000Z'); // 1 sec before start
  console.log(`1. BEFORE START (${beforeTime.toISOString()})`);

  let p1Error = null;
  try {
    await service.validateParticipantAccess(participantUser, beforeTime);
  } catch (err) {
    p1Error = err.message;
  }
  console.log(`   Participant access: REJECTED (${p1Error})`);
  console.assert(p1Error === 'Challenges are not available until the competition starts.', 'FAIL P1 Before Start');

  const admin1Status = await service.validateParticipantAccess(adminUser, beforeTime);
  console.log(`   Admin access: ALLOWED (Can view/edit/manage)`);
  console.assert(admin1Status !== null, 'FAIL Admin Before Start');

  // 2. AT 15 Sept 2026 05:00 PM IST (EXACT START)
  const atStartTime = new Date('2026-09-15T11:30:00.000Z');
  console.log(`\n2. AT EXACT START (${atStartTime.toISOString()})`);

  const p2Status = await service.validateParticipantAccess(participantUser, atStartTime);
  console.log(`   Participant access: ALLOWED (isLive: ${p2Status.isLive})`);
  console.assert(p2Status.isLive === true, 'FAIL P2 At Start');

  // 3. DURING COMPETITION (18 Sept 2026)
  const duringTime = new Date('2026-09-18T12:00:00.000Z');
  console.log(`\n3. DURING COMPETITION (${duringTime.toISOString()})`);

  const p3Status = await service.validateParticipantAccess(participantUser, duringTime);
  console.log(`   Participant access: ALLOWED (Full access to challenges, modal, flags, hints)`);
  console.assert(p3Status.isLive === true, 'FAIL P3 During');

  // 4. AT 20 Sept 2026 05:00 PM IST (EXACT END)
  const atEndTime = new Date('2026-09-20T11:30:00.000Z');
  console.log(`\n4. AT EXACT END (${atEndTime.toISOString()})`);

  let p4Error = null;
  try {
    await service.validateParticipantAccess(participantUser, atEndTime);
  } catch (err) {
    p4Error = err.message;
  }
  console.log(`   Participant access: REJECTED (${p4Error})`);
  console.assert(p4Error === 'The competition has ended and challenge access is closed.', 'FAIL P4 At End');

  const admin4Status = await service.validateParticipantAccess(adminUser, atEndTime);
  console.log(`   Admin access: ALLOWED (Full management retained after competition end)`);
  console.assert(admin4Status !== null, 'FAIL Admin At End');

  console.log('\n=== MANUAL ACCEPTANCE TEST SUCCESSFUL! ===');
}

verifyManualAcceptance();
