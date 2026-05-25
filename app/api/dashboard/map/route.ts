import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getSession } from '@/app/_lib/sessions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    const userId = Number(session?.sub);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with company and vehicle access
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: {
          select: { id: true, name: true }
        },
        vehicleAccess: {
          where: { isActive: true },
          select: { vehicleId: true, accessType: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine which vehicles user can see
    let vehicleIds: string[] = [];
    
    if (user.role === 'ADMIN' || user.role === 'OWNER') {
      // Admin/Owner sees all company vehicles
      const companyVehicles = await prisma.vehicle.findMany({
        where: { companyId: user.companyId, isActive: true },
        select: { id: true }
      });
      vehicleIds = companyVehicles.map(v => v.id);
    } else {
      // Regular user sees only vehicles they have access to
      vehicleIds = user.vehicleAccess.map(access => access.vehicleId);
    }

    if (vehicleIds.length === 0) {
      return NextResponse.json({ vehicles: [] });
    }

    // Get vehicle status with location data
    const vehicles = await prisma.vehicle.findMany({
      where: { 
        id: { in: vehicleIds },
        isActive: true 
      },
      select: {
        id: true,
        plateNumber: true,
        Type: true,
        make: true,
        model: true,
        year: true,
        status: {
          select: {
            latitude: true,
            longitude: true,
            speed: true,
            course: true,
            state: true,
            fuelLevel: true,
            engineHours: true,
            odometer: true,
            updatedAt: true
          }
        },
        driver: {
          select: {
            name: true,
            phone: true
          }
        },
        alerts: {
          where: { 
            isResolved: false,
            severity: { in: ['HIGH', 'CRITICAL'] }
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            severity: true,
            message: true,
            type: true
          }
        }
      }
    });

    // Filter vehicles with valid coordinates
    const vehiclesWithLocation = vehicles
      .filter(v => v.status?.latitude && v.status?.longitude)
      .map(v => ({
        id: v.id,
        plateNumber: v.plateNumber,
        type: v.Type,
        make: v.make,
        model: v.model,
        driverName: v.driver?.name,
        location: {
          lat: v.status!.latitude,
          lng: v.status!.longitude
        },
        speed: v.status!.speed || 0,
        course: v.status!.course || 0,
        state: v.status!.state,
        fuelLevel: v.status!.fuelLevel || 0,
        engineHours: v.status!.engineHours || 0,
        odometer: v.status!.odometer || 0,
        lastUpdate: v.status!.updatedAt,
        hasAlert: v.alerts.length > 0,
        alertSeverity: v.alerts[0]?.severity,
        alertMessage: v.alerts[0]?.message
      }));

    return NextResponse.json({
      vehicles: vehiclesWithLocation,
      lastUpdate: new Date().toISOString()
    });

  } catch (error) {
    console.error('Map API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}